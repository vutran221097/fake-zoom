"use client";

import React, { useState, useRef, useEffect } from "react";
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
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  Volume2,
  VolumeX,
  Camera,
  MonitorSpeaker,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTab, setActiveTab] = useState("video");
  const [volume, setVolume] = useState(0.8);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize camera and microphone
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Set up audio analysis for talking detection
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        source.connect(analyserRef.current);

        // Start talking detection
        detectTalking();
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    initializeMedia();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Talking detection function
  const detectTalking = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const checkAudioLevel = () => {
      analyserRef.current!.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      // Threshold for talking detection
      setIsTalking(average > 30 && isAudioOn);

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !isAudioOn;
      });
    }
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isVideoOn;
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        setActiveTab("screen");
      } else {
        // Switch back to camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = cameraStream;
        }

        setIsScreenSharing(false);
        setActiveTab("video");
      }
    } catch (error) {
      console.error("Error with screen sharing:", error);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleNavigateBack = () => {
    router.push("/");
  };

  const handleExit = () => {
    if (window.confirm("Are you sure you want to leave this meeting?")) {
      // Stop all media streams
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      onExit();
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Navigation Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">Room: {roomId}</h1>
            {isTalking && (
              <div className="flex items-center gap-1 text-green-500">
                <Volume2 className="h-4 w-4 animate-pulse" />
                <span className="text-xs">Speaking</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
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
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                }}
              >
                {participants.map((participant) => (
                  <Card
                    key={participant.id}
                    className="overflow-hidden relative"
                  >
                    <CardContent className="p-0 aspect-video relative bg-muted flex items-center justify-center">
                      {participant.isVideoOn ? (
                        <div className="w-full h-full bg-black relative">
                          {participant.id === "1" ? (
                            <video
                              ref={videoRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={`https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&face=${participant.id}`}
                              alt={`${participant.name} video`}
                              className="w-full h-full object-cover"
                            />
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
                      {participant.id === "1" && isTalking && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                          <Volume2 className="h-3 w-3 animate-pulse" />
                          Talking
                        </div>
                      )}

                      {/* Participant info overlay */}
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/70 text-white p-2 rounded backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {participant.name}
                          </span>
                          {participant.id === "1" && (
                            <span className="text-xs bg-blue-500 px-1 rounded">
                              (You)
                            </span>
                          )}
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
              <div
                className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center",
                }}
              >
                {isScreenSharing ? (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-contain"
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
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Meeting Info and Exit */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium">Room: {roomId}</div>
            <div className="text-xs text-muted-foreground">
              {participants.length} participant
              {participants.length !== 1 ? "s" : ""}
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
