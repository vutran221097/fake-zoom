"use client";

import React, { useState, useEffect } from "react";
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
  Volume2,
  VolumeX,
  Camera,
  MonitorSpeaker,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { isSupabaseConfigured } from "@/lib/supabase";

interface VideoConferenceProps {
  roomId?: string;
  participantCount?: number;
  onExit?: () => void;
}

export default function VideoConference({
  roomId = "room-123",
  participantCount = 1,
  onExit = () => {},
}: VideoConferenceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("video");
  const [volume, setVolume] = useState(0.8);
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("userId");
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("userId", id);
      }
      return id;
    }
    return crypto.randomUUID();
  });
  const [userName] = useState(() => `User ${Math.floor(Math.random() * 1000)}`);
  const [showSupabaseWarning, setShowSupabaseWarning] = useState(
    !isSupabaseConfigured(),
  );

  // Use WebRTC hook for real-time communication
  const {
    participants,
    localStream,
    localVideoRef,
    isAudioOn,
    isVideoOn,
    isScreenSharing,
    isConnected,
    chatMessages,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
    leaveRoom,
  } = useWebRTC(roomId, userId, userName);

  // Chat state
  const [chatInput, setChatInput] = useState("");

  // Get current user's talking state from participants
  const currentUser = participants.find((p: any) => p.id === userId);
  const isTalking = currentUser?.isTalking || false;

  // Add current user to participants list for display
  const allParticipants = React.useMemo(() => {
    const currentUserParticipant = {
      id: userId,
      name: `${userName} (You)`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      isScreenSharing,
      isVideoOn,
      isAudioOn,
      stream: localStream,
      isTalking,
    };

    // Filter out current user from remote participants to avoid duplicates
    const remoteParticipants = participants.filter((p: any) => p.id !== userId);

    return [currentUserParticipant, ...remoteParticipants];
  }, [
    participants,
    localStream,
    isVideoOn,
    isAudioOn,
    isScreenSharing,
    isTalking,
    userId,
    userName,
  ]);

  // Audio analysis is now handled in the useWebRTC hook

  // Ensure video element gets the stream properly
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      const video = localVideoRef.current;

      // Only update if the stream has changed
      if (video.srcObject !== localStream) {
        video.srcObject = localStream;

        const handleLoadedMetadata = () => {
          console.log("Video metadata loaded");
          video.play().catch((error: any) => {
            console.warn("Video play failed:", error);
          });
        };

        const handleCanPlay = () => {
          console.log("Video can play");
        };

        const handleError = (e: Event) => {
          console.error("Video error:", e);
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata, {
          once: true,
        });
        video.addEventListener("canplay", handleCanPlay, { once: true });
        video.addEventListener("error", handleError);

        return () => {
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
        };
      }
    }
  }, [localStream]);

  // Talking detection is now handled in the useWebRTC hook via Socket.IO

  // Handle screen share tab switching
  useEffect(() => {
    if (isScreenSharing) {
      setActiveTab("screen");
    } else {
      setActiveTab("video");
    }
  }, [isScreenSharing]);

  const handleExit = async () => {
    if (window.confirm("Are you sure you want to leave this meeting?")) {
      await leaveRoom();
      onExit();
      router.push("/");
    }
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput);
      setChatInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show Supabase configuration warning if not configured
  if (showSupabaseWarning) {
    return (
      <div className="flex flex-col h-full w-full bg-background items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <Wifi className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold">Demo Mode</h2>
          <p className="text-muted-foreground">
            Running in demo mode with mock participants. Connect to Supabase for
            full real-time features.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => setShowSupabaseWarning(false)}
              className="w-full"
            >
              Continue with Demo
            </Button>
            <p className="text-xs text-muted-foreground">
              Video calling features work locally
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Navigation Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-500">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">Connecting...</span>
                </div>
              )}
              {isTalking && (
                <div className="flex items-center gap-1 text-green-500">
                  <Volume2 className="h-4 w-4 animate-pulse" />
                  <span className="text-xs">Speaking</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-transform duration-200">
                {allParticipants.map((participant: any) => (
                  <Card
                    key={participant.id}
                    className="overflow-hidden relative"
                  >
                    <CardContent className="p-0 aspect-video relative bg-muted flex items-center justify-center">
                      {participant.isVideoOn ? (
                        <div className="w-full h-full bg-black relative">
                          {participant.id === userId ? (
                            <video
                              ref={localVideoRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover transform scale-x-[-1]"
                              style={{
                                backgroundColor: "transparent",
                                minHeight: "100%",
                                minWidth: "100%",
                              }}
                              onLoadedMetadata={(e: any) => {
                                console.log("Local video loaded metadata");
                                const video = e.target as HTMLVideoElement;
                                video.play().catch(console.error);
                              }}
                              onError={(e: any) => {
                                console.error("Local video error:", e);
                              }}
                            />
                          ) : participant.stream ? (
                            <video
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                              style={{
                                backgroundColor: "transparent",
                                minHeight: "100%",
                                minWidth: "100%",
                              }}
                              ref={(video: any) => {
                                if (video && participant.stream) {
                                  video.srcObject = participant.stream;
                                  video.onloadedmetadata = () => {
                                    video.play().catch(console.error);
                                  };
                                }
                              }}
                              onError={(e: any) => {
                                console.error("Participant video error:", e);
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
                              <div className="text-white text-center">
                                <Camera className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-sm">Connecting video...</p>
                              </div>
                            </div>
                          )}

                          {/* Camera indicator */}
                          <div className="absolute top-2 right-2">
                            <Camera className="h-4 w-4 text-white/70" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <Avatar className="w-24 h-24">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.id}`}
                            />
                            <AvatarFallback>
                              {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}

                      {/* Talking indicator */}
                      {participant.isTalking && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <Volume2 className="h-3 w-3 animate-pulse" />
                          {participant.id === userId
                            ? "You are talking"
                            : "Talking"}
                        </div>
                      )}

                      {/* Participant info overlay */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/70 text-white p-2 rounded backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {participant.name}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {!participant.isAudioOn && (
                            <MicOff size={16} className="text-red-400" />
                          )}
                          {!participant.isVideoOn && (
                            <VideoOff size={16} className="text-red-400" />
                          )}
                          {participant.isScreenSharing && (
                            <Monitor size={16} className="text-green-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="screen" className="w-full">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden">
                {isScreenSharing ? (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center relative">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                      style={{
                        backgroundColor: "transparent",
                      }}
                    />

                    {/* Screen share controls */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={toggleScreenShare}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <MonitorSpeaker className="h-4 w-4 mr-2" />
                        Stop Sharing
                      </Button>
                    </div>

                    {/* Screen share indicator */}
                    <div className="absolute bottom-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      You are sharing your screen
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Monitor size={48} className="mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">
                      No screen sharing active
                    </h3>
                    <p className="text-sm mb-4">
                      Share your screen to show presentations, documents, or
                      applications
                    </p>
                    <Button
                      variant="outline"
                      className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                      onClick={toggleScreenShare}
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Start Screen Share
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
                <span>Participants ({allParticipants.length})</span>
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
                  {allParticipants.map((participant: any) => (
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
                        <span>{participant.name}</span>
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
                        {participant.isScreenSharing && (
                          <Monitor size={16} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex flex-col gap-1 ${
                          message.userId === userId
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            message.userId === userId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="font-medium text-xs opacity-70 mb-1">
                            {message.userId === userId
                              ? "You"
                              : message.userName}
                          </div>
                          <div>{message.message}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" onClick={handleSendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Enhanced Control bar */}
      <div className="h-20 border-t border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          {/* Audio Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={isAudioOn ? "outline" : "destructive"}
              size="icon"
              onClick={toggleAudio}
              className={`relative ${isTalking ? "ring-2 ring-green-400" : ""}`}
            >
              {isAudioOn ? <Mic /> : <MicOff />}
            </Button>
            {isTalking && (
              <div className="flex items-center text-green-500 text-xs">
                <Volume2 className="h-3 w-3 animate-pulse mr-1" />
                Speaking
              </div>
            )}
          </div>

          {/* Video Controls */}
          <Button
            variant={isVideoOn ? "outline" : "destructive"}
            size="icon"
            onClick={toggleVideo}
            className="relative"
          >
            {isVideoOn ? <Video /> : <VideoOff />}
            {isVideoOn && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
            )}
          </Button>

          {/* Screen Share Controls */}
          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="icon"
            onClick={toggleScreenShare}
            className={isScreenSharing ? "bg-blue-500 hover:bg-blue-600" : ""}
          >
            <Monitor />
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 ml-4">
            <Button variant="ghost" size="icon">
              {volume > 0 ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e: any) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Meeting Info and Exit */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">Room: {roomId}</div>
            <div className="text-xs text-muted-foreground">
              {allParticipants.length} participant
              {allParticipants.length !== 1 ? "s" : ""}
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={handleExit}
            className="bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave Meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
