"use client";

import React, { useEffect, useState } from "react";
import RoomList from "@/components/rooms/RoomList";
import { socket } from "@/socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  useEffect(() => {
    if (localStorage.getItem("userId")) {
      return;
    } else {
      const userId = crypto.randomUUID();
      localStorage.setItem("userId", userId);
    }
  }, []);

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }
    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport: any) => {
        setTransport(transport.name);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">
              Meeting Rooms
            </h1>
            <p>Status: {isConnected ? "connected" : "disconnected"}</p>
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
