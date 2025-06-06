"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import RoomCard from "./RoomCard";
import { roomService, Room } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface RoomListProps {
  onCreateRoom?: () => void;
  onJoinRoom?: (roomId: string) => void;
}

const RoomList = ({ onCreateRoom, onJoinRoom }: RoomListProps) => {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Load rooms on component mount
  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    const roomsData = await roomService.getRooms();
    setRooms(roomsData);
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      const roomName = `Meeting Room ${Date.now()}`;
      setNewRoomName(roomName);
    }

    setIsCreating(true);
    const room = await roomService.createRoom(
      newRoomName.trim() || `Meeting Room ${Date.now()}`,
    );

    if (room) {
      setRooms((prev) => [room, ...prev]);
      setNewRoomName("");
      if (onCreateRoom) {
        onCreateRoom();
      }
    }
    setIsCreating(false);
  };

  const handleJoinRoom = (roomId: string) => {
    if (onJoinRoom) {
      onJoinRoom(roomId);
    } else {
      router.push(`/room/${roomId}`);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && room.is_active) ||
      (filter === "inactive" && !room.is_active);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full bg-background p-6 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Meeting Rooms</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Room name (optional)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="flex-1 md:w-48"
            onKeyPress={(e) => e.key === "Enter" && handleCreateRoom()}
          />
          <Button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className="flex-1 md:flex-none"
          >
            All
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            onClick={() => setFilter("active")}
            className="flex-1 md:flex-none"
          >
            Active
          </Button>
          <Button
            variant={filter === "inactive" ? "default" : "outline"}
            onClick={() => setFilter("inactive")}
            className="flex-1 md:flex-none"
          >
            Inactive
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            {rooms.length === 0
              ? "No rooms available. Create your first room to get started!"
              : "No rooms found matching your criteria"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              isActive={room.is_active}
              participantCount={room.participant_count}
              onJoin={handleJoinRoom}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
