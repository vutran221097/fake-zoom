"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import RoomCard from "./RoomCard";

interface Room {
  id: string;
  name: string;
  isActive: boolean;
  participantCount: number;
}

interface RoomListProps {
  rooms?: Room[];
  onCreateRoom?: () => void;
  onJoinRoom?: (roomId: string) => void;
}

const RoomList = ({
  rooms = [
    {
      id: "1",
      name: "Marketing Team Weekly",
      isActive: true,
      participantCount: 5,
    },
    { id: "2", name: "Product Planning", isActive: false, participantCount: 0 },
    { id: "3", name: "Design Review", isActive: true, participantCount: 3 },
    {
      id: "4",
      name: "Engineering Standup",
      isActive: false,
      participantCount: 0,
    },
    { id: "5", name: "Customer Feedback", isActive: true, participantCount: 2 },
    {
      id: "6",
      name: "Quarterly Planning",
      isActive: false,
      participantCount: 0,
    },
  ],
  onCreateRoom = () => console.log("Create room clicked"),
  onJoinRoom = (roomId) => console.log(`Join room ${roomId} clicked`),
}: RoomListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && room.isActive) ||
      (filter === "inactive" && !room.isActive);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full bg-background p-6 rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Meeting Rooms</h2>
        <Button onClick={onCreateRoom} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Create New Room
        </Button>
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

      {filteredRooms.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            No rooms found matching your criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              name={room.name}
              isActive={room.isActive}
              participantCount={room.participantCount}
              onJoin={onJoinRoom}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
