"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isScreenSharing: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
}

interface VideoConferenceProps {
  roomId?: string;
  participants?: Participant[];
  onExit?: () => void;
}

export default function VideoConference({
  roomId = "room-123",
  participants = [
    {
      id: "1",
      name: "You",
      avatar: "",
      isScreenSharing: false,
      isVideoOn: true,
      isAudioOn: true,
    },
    {
      id: "2",
      name: "John Doe",
      avatar: "",
      isScreenSharing: false,
      isVideoOn: true,
      isAudioOn: true,
    },
    {
      id: "3",
      name: "Jane Smith",
      avatar: "",
      isScreenSharing: false,
      isVideoOn: true,
      isAudioOn: false,
    },
    {
      id: "4",
      name: "Alex Johnson",
      avatar: "",
      isScreenSharing: false,
      isVideoOn: false,
      isAudioOn: true,
    },
  ],
  onExit = () => {},
}: VideoConferenceProps) {
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState("video");

  const toggleAudio = () => setIsAudioOn(!isAudioOn);
  const toggleVideo = () => setIsVideoOn(!isVideoOn);

  const toggleScreenShare = () => {
    // In a real implementation, this would trigger screen sharing API
    setIsScreenSharing(!isScreenSharing);
  };

  const handleExit = () => {
    // Confirm before exiting
    if (window.confirm("Are you sure you want to leave this meeting?")) {
      onExit();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 overflow-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="video">Video Grid</TabsTrigger>
              <TabsTrigger value="screen">Screen Share</TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant) => (
                  <Card key={participant.id} className="overflow-hidden">
                    <CardContent className="p-0 aspect-video relative bg-muted flex items-center justify-center">
                      {participant.isVideoOn ? (
                        <div className="w-full h-full bg-black">
                          {/* Video would be rendered here in a real implementation */}
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.id}`}
                            alt="Video placeholder"
                            className="w-full h-full object-cover opacity-50"
                          />
                        </div>
                      ) : (
                        <Avatar className="w-24 h-24">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.id}`}
                          />
                          <AvatarFallback>
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Participant info overlay */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/50 text-white p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span>{participant.name}</span>
                          {participant.id === "1" && (
                            <span className="text-xs">(You)</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {!participant.isAudioOn && <MicOff size={16} />}
                          {!participant.isVideoOn && <VideoOff size={16} />}
                          {participant.isScreenSharing && <Monitor size={16} />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="screen" className="w-full">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                {isScreenSharing ? (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    {/* Screen share content would be rendered here */}
                    <img
                      src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80"
                      alt="Screen share placeholder"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Monitor size={48} className="mx-auto mb-2" />
                    <p>No one is sharing their screen</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={toggleScreenShare}
                    >
                      Share your screen
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-border hidden md:block">
          <Tabs defaultValue="participants" className="h-full flex flex-col">
            <TabsList className="w-full justify-start px-2 pt-2">
              <TabsTrigger
                value="participants"
                className="flex items-center gap-2"
              >
                <Users size={16} />
                <span>Participants ({participants.length})</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span>Chat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="participants"
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.id}`}
                          />
                          <AvatarFallback>
                            {participant.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {participant.name} {participant.id === "1" && "(You)"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {!participant.isAudioOn && (
                          <MicOff size={16} className="text-muted-foreground" />
                        )}
                        {!participant.isVideoOn && (
                          <VideoOff
                            size={16}
                            className="text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <p className="text-center text-muted-foreground text-sm">
                    Chat messages will appear here
                  </p>
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
                  />
                  <Button size="sm">Send</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Control bar */}
      <div className="h-16 border-t border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant={isAudioOn ? "outline" : "destructive"}
            size="icon"
            onClick={toggleAudio}
          >
            {isAudioOn ? <Mic /> : <MicOff />}
          </Button>
          <Button
            variant={isVideoOn ? "outline" : "destructive"}
            size="icon"
            onClick={toggleVideo}
          >
            {isVideoOn ? <Video /> : <VideoOff />}
          </Button>
          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="icon"
            onClick={toggleScreenShare}
          >
            <Monitor />
          </Button>
        </div>

        <div className="flex items-center">
          <span className="mr-4 text-sm text-muted-foreground">
            Room: {roomId}
          </span>
          <Button variant="destructive" onClick={handleExit}>
            <PhoneOff className="mr-2" />
            Leave Meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
