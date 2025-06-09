"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import RoomCard from "./RoomCard";
import { roomService, Room, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface RoomListProps {
  onCreateRoom?: () => void;
  onJoinRoom?: (roomId: string) => void;
}

const RoomList = ({ onCreateRoom, onJoinRoom }: RoomListProps) => {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Load rooms on component mount
  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      const roomsData = await roomService.getRooms();
      setRooms(roomsData);
    } else {
      // Show mock rooms when Supabase is not configured
      setRooms([
        {
          id: "demo-room-1",
          name: "Team Standup",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          is_active: false,
          participant_count: 0,
        },
        {
          id: "demo-room-2",
          name: "Project Review",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          is_active: true,
          participant_count: 3,
        },
        {
          id: "conference-1",
          name: "Client Presentation",
          created_at: new Date(Date.now() - 7200000).toISOString(),
          is_active: false,
          participant_count: 0,
        },
        {
          id: "workshop",
          name: "Design Workshop",
          created_at: new Date().toISOString(),
          is_active: true,
          participant_count: 5,
        },
      ]);
    }
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      const roomName = `Meeting Room ${Date.now()}`;
      setNewRoomName(roomName);
    }

    setIsCreating(true);

    if (isSupabaseConfigured()) {
      const room = await roomService.createRoom(
        newRoomName.trim() || `Meeting Room ${Date.now()}`
      );

      if (room) {
        setRooms((prev) => [room, ...prev]);
        setNewRoomName("");
        if (onCreateRoom) {
          onCreateRoom();
        }
      }
    } else {
      // Create mock room when Supabase is not configured
      const mockRoom: Room = {
        id: `demo-room-${Date.now()}`,
        name: newRoomName.trim() || `Meeting Room ${Date.now()}`,
        created_at: new Date().toISOString(),
        is_active: false,
        participant_count: 0,
      };

      setRooms((prev) => [mockRoom, ...prev]);
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

  return (
    <div className="w-full bg-background p-6 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Meeting Rooms</h2>
        {/* <div className="flex gap-2 w-full md:w-auto">
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
        </div> */}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
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
