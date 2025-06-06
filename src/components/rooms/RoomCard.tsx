"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoomCardProps {
  id: string;
  name: string;
  isActive: boolean;
  participantCount: number;
  onJoin: (id: string) => void;
}

const RoomCard = ({
  id = "room-1",
  name = "Meeting Room",
  isActive = false,
  participantCount = 0,
  onJoin = () => {},
}: RoomCardProps) => {
  const router = useRouter();

  const handleJoin = () => {
    onJoin(id);
  };
  return (
    <Card className="w-full max-w-[350px] h-[200px] overflow-hidden transition-all hover:shadow-lg bg-card">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold truncate">{name}</h3>
          <Badge
            variant={isActive ? "default" : "outline"}
            className={`${isActive ? "bg-green-500 hover:bg-green-600" : ""}`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="flex items-center text-muted-foreground mb-auto">
          <Users className="h-4 w-4 mr-2" />
          <span>
            {participantCount}{" "}
            {participantCount === 1 ? "participant" : "participants"}
          </span>
        </div>

        <div className="flex items-center text-muted-foreground">
          <Video className="h-4 w-4 mr-2" />
          <span>{isActive ? "Meeting in progress" : "Room available"}</span>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button
          onClick={handleJoin}
          className="w-full"
          variant={isActive ? "outline" : "default"}
        >
          {isActive ? "Join Meeting" : "Start Meeting"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RoomCard;
