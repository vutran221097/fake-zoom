"use client";

import React from "react";
import RoomList from "@/components/rooms/RoomList";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">
              Meeting Rooms
            </h1>
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Room
            </Button>
          </div>
          <p className="text-muted-foreground mt-2">
            Join an existing meeting room or create a new one
          </p>
        </header>

        <main>
          <RoomList />
        </main>
      </div>
    </div>
  );
}
