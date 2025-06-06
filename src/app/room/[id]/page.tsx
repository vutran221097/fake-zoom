"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import VideoConference from "@/components/video/VideoConference";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [roomName, setRoomName] = useState("Meeting Room");
  const [participantCount, setParticipantCount] = useState(1);

  // Simulate loading room data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // In a real app, you would fetch room details here
      setRoomName(`Meeting Room ${roomId}`);
      // Simulate random number of participants (1-6)
      setParticipantCount(Math.floor(Math.random() * 5) + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-lg font-medium">Loading meeting room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to room list</span>
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">{roomName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            {participantCount} participants
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <VideoConference roomId={roomId} participantCount={participantCount} />
      </main>
    </div>
  );
}
