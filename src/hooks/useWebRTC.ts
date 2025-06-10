"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import io from "socket.io-client";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isScreenSharing: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  stream?: MediaStream;
  isTalking?: boolean;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  from: string;
  to: string;
  roomId: string;
}

interface TalkingData {
  userId: string;
  roomId: string;
  isTalking: boolean;
}

export const useWebRTC = (roomId: string, userId: string, userName: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamsRef = useRef<{ [key: string]: MediaStream }>({});
  const channelRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      // Always request audio, video based on isVideoOn state
      const constraints: any = {
        video: isVideoOn
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      };

      console.log("Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Media stream obtained:", {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });

      setLocalStream(stream);

      if (localVideoRef.current && isVideoOn) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize audio analysis for talking detection
      if (stream.getAudioTracks().length > 0) {
        initializeAudioAnalysis(stream);
      }

      return stream;
    } catch (error: any) {
      console.error("Error accessing media devices:", error);
      // Try with audio only if video fails
      if (isVideoOn) {
        try {
          console.log("Retrying with audio only...");
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          setLocalStream(audioOnlyStream);
          setIsVideoOn(false);
          return audioOnlyStream;
        } catch (audioError: any) {
          console.error("Error accessing audio:", audioError);
        }
      }
      return null;
    }
  }, [isVideoOn]);

  // Initialize audio analysis for talking detection
  const initializeAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start talking detection
      detectTalking();
    } catch (error: any) {
      console.error("Error setting up audio analysis:", error);
    }
  }, []);

  // Talking detection function
  const detectTalking = useCallback(() => {
    if (!analyserRef.current || !socketRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    let lastTalkingState = false;

    const checkAudioLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const isTalking = average > 30 && isAudioOn;

      // Only emit if talking state changed
      if (isTalking !== lastTalkingState) {
        lastTalkingState = isTalking;
        socketRef.current?.emit("talking", {
          userId,
          roomId,
          isTalking,
        });
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  }, [userId, roomId, isAudioOn]);

  // Create peer connection
  const createPeerConnection = useCallback(
    (participantId: string) => {
      const peerConnection = new RTCPeerConnection(rtcConfig);

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event: any) => {
        const [remoteStream] = event.streams;
        console.log(`Received remote stream from ${participantId}`);
        remoteStreamsRef.current[participantId] = remoteStream;

        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, stream: remoteStream } : p
          )
        );
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event: any) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("signal", {
            type: "ice-candidate",
            data: event.candidate,
            from: userId,
            to: participantId,
            roomId,
          });
        }
      };

      // Connection state monitoring
      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Peer connection state with ${participantId}: ${peerConnection.connectionState}`
        );
      };

      peersRef.current[participantId] = peerConnection;
      return peerConnection;
    },
    [localStream, userId, roomId]
  );

  // Handle incoming signaling data
  const handleSignal = useCallback(
    async (signal: SignalData) => {
      console.log("Received signal:", signal.type, "from:", signal.from);

      const peerConnection =
        peersRef.current[signal.from] || createPeerConnection(signal.from);

      try {
        switch (signal.type) {
          case "offer":
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(signal.data)
            );
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            if (socketRef.current) {
              socketRef.current.emit("signal", {
                type: "answer",
                data: answer,
                from: userId,
                to: signal.from,
                roomId,
              });
            }
            break;

          case "answer":
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(signal.data)
            );
            break;

          case "ice-candidate":
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(signal.data)
            );
            break;
        }
      } catch (error: any) {
        console.error("Error handling signal:", error);
      }
    },
    [createPeerConnection, userId, roomId]
  );

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) return;

    // Connect to the local server
    socketRef.current = io({
      transports: ["websocket", "polling"],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to socket server with ID:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason: any) => {
      console.log("Disconnected from socket server:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error: any) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    socket.on("signal", handleSignal);

    socket.on("participant-joined", (participant: Participant) => {
      console.log("Participant joined:", participant);
      if (participant.id !== userId) {
        setParticipants((prev) => {
          const exists = prev.find((p) => p.id === participant.id);
          if (!exists) {
            // Create peer connection for new participant
            createPeerConnection(participant.id);
            return [...prev, participant];
          }
          return prev;
        });

        // Create offer for new participant
        setTimeout(async () => {
          const peerConnection = peersRef.current[participant.id];
          if (peerConnection) {
            try {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);

              socket.emit("signal", {
                type: "offer",
                data: offer,
                from: userId,
                to: participant.id,
                roomId,
              });
            } catch (error: any) {
              console.error("Error creating offer:", error);
            }
          }
        }, 1000);
      }
    });

    socket.on("participant-left", (participantId: string) => {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      if (peersRef.current[participantId]) {
        peersRef.current[participantId].close();
        delete peersRef.current[participantId];
      }
    });

    socket.on("participant-updated", (participant: Participant) => {
      if (participant.id !== userId) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participant.id ? { ...p, ...participant } : p
          )
        );
      }
    });

    socket.on("talking", (data: TalkingData) => {
      if (data.userId !== userId) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === data.userId ? { ...p, isTalking: data.isTalking } : p
          )
        );
      }
    });

    return socket;
  }, [userId, handleSignal, createPeerConnection]);

  // Join room and establish connections
  const joinRoom = useCallback(async () => {
    if (hasJoined) return; // Prevent duplicate joins

    try {
      if (!socketRef.current) {
        console.error("Socket not initialized");
        return;
      }

      console.log(`Joining room ${roomId} as ${userName}`);

      // Join room via socket
      socketRef.current.emit("join-room", {
        roomId,
        participant: {
          id: userId,
          name: userName,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          isScreenSharing,
          isVideoOn,
          isAudioOn,
          isTalking: false,
        },
      });

      setHasJoined(true);

      console.log(`Successfully joined room ${roomId}`);

      // Also handle Supabase if configured
      if (isSupabaseConfigured()) {
        // Create or get room
        const { data: existingRoom, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .maybeSingle(); // Use maybeSingle() to handle 0 rows gracefully

        if (roomError) {
          console.error("Error checking room:", roomError);
        }

        if (!existingRoom) {
          const { error: createError } = await supabase.from("rooms").insert({
            id: roomId,
            name: `Meeting Room ${roomId}`,
            is_active: true,
            participant_count: 0,
          });

          if (createError) {
            console.error("Error creating room:", createError);
          }
        }

        // Check if already joined to prevent duplicates
        const { data: existingParticipant, error: participantError } =
          await supabase
            .from("participants")
            .select("*")
            .eq("room_id", roomId)
            .eq("user_id", userId)
            .maybeSingle(); // Use maybeSingle() to handle 0 rows gracefully

        if (participantError) {
          console.error("Error checking participant:", participantError);
        }

        if (!existingParticipant) {
          const { error: joinError } = await supabase
            .from("participants")
            .insert({
              room_id: roomId,
              user_id: userId,
              name: userName,
              is_video_on: isVideoOn,
              is_audio_on: isAudioOn,
              is_screen_sharing: isScreenSharing,
            });

          if (joinError) {
            console.error("Error joining room:", joinError);
          }
        }
      }
    } catch (error: any) {
      console.error("Error joining room:", error);
    }
  }, [
    roomId,
    userId,
    userName,
    isVideoOn,
    isAudioOn,
    isScreenSharing,
    hasJoined,
  ]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    try {
      // Leave room via socket
      if (socketRef.current) {
        socketRef.current.emit("leave-room", { roomId, userId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Close all peer connections
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Remove from database
      if (isSupabaseConfigured()) {
        // Delete participant record
        const { error: deleteError } = await supabase
          .from("participants")
          .delete()
          .eq("room_id", roomId)
          .eq("user_id", userId);

        if (deleteError) {
          console.error("Error deleting participant:", deleteError);
        }

        // Update room participant count
        const { data: remainingParticipants, error: countError } =
          await supabase.from("participants").select("*").eq("room_id", roomId);

        if (countError) {
          console.error("Error counting participants:", countError);
          return;
        }

        const participantCount = remainingParticipants?.length || 0;

        // Check if room exists before updating
        const { data: existingRoom, error: roomError } = await supabase
          .from("rooms")
          .select("id")
          .eq("id", roomId)
          .single();

        if (roomError) {
          console.error("Room not found or error checking room:", roomError);
          return;
        }

        if (existingRoom) {
          const { error: updateError } = await supabase
            .from("rooms")
            .update({
              participant_count: participantCount,
              is_active: participantCount > 0,
            })
            .eq("id", roomId);

          if (updateError) {
            console.error("Error updating room:", updateError);
          }
        }
      }

      // Close realtime channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setIsConnected(false);
      setParticipants([]);
      setHasJoined(false);
    } catch (error: any) {
      console.error("Error leaving room:", error);
    }
  }, [localStream, roomId, userId]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    try {
      const newAudioState = !isAudioOn;

      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = newAudioState;
          setIsAudioOn(newAudioState);

          // Update via socket
          if (socketRef.current) {
            socketRef.current.emit("participant-update", {
              roomId,
              participant: {
                id: userId,
                isVideoOn,
                isAudioOn: newAudioState,
                isScreenSharing,
              },
            });
          }

          // Update database
          if (isSupabaseConfigured()) {
            await supabase
              .from("participants")
              .update({ is_audio_on: newAudioState })
              .eq("room_id", roomId)
              .eq("user_id", userId);
          }

          console.log(`Audio toggled to: ${newAudioState ? "ON" : "OFF"}`);
        }
      }
    } catch (error: any) {
      console.error("Error toggling audio:", error);
    }
  }, [localStream, isAudioOn, roomId, userId, isVideoOn, isScreenSharing]);

  // Toggle video - IMPROVED VERSION
  const toggleVideo = useCallback(async () => {
    try {
      const newVideoState = !isVideoOn;

      if (newVideoState) {
        // Turning video ON - get new video stream
        console.log("Turning video ON - getting video stream");

        const constraints: any = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };

        const newStream =
          await navigator.mediaDevices.getUserMedia(constraints);
        const videoTrack = newStream.getVideoTracks()[0];
        const audioTrack = newStream.getAudioTracks()[0];

        if (localStream) {
          // Stop existing tracks
          localStream.getTracks().forEach((track) => track.stop());
        }

        setLocalStream(newStream);

        // Update video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          try {
            await localVideoRef.current.play();
          } catch (playError: any) {
            console.warn("Video play failed:", playError);
          }
        }

        // Replace tracks in all peer connections
        Object.values(peersRef.current).forEach((pc) => {
          const videoSender = pc
            .getSenders()
            .find(
              (sender: any) => sender.track && sender.track.kind === "video"
            );
          const audioSender = pc
            .getSenders()
            .find(
              (sender: any) => sender.track && sender.track.kind === "audio"
            );

          if (videoSender) {
            videoSender.replaceTrack(videoTrack).catch(console.error);
          } else {
            pc.addTrack(videoTrack, newStream);
          }

          if (audioSender) {
            audioSender.replaceTrack(audioTrack).catch(console.error);
          } else {
            pc.addTrack(audioTrack, newStream);
          }
        });

        // Initialize audio analysis for talking detection
        if (audioTrack) {
          initializeAudioAnalysis(newStream);
        }
      } else {
        // Turning video OFF - keep audio only
        console.log("Turning video OFF");
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach((track) => track.stop());

          // Create new stream with only audio
          const audioTracks = localStream.getAudioTracks();
          const newStream = new MediaStream(audioTracks);
          setLocalStream(newStream);

          // Update video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }

          // Remove video track from peer connections
          Object.values(peersRef.current).forEach((pc) => {
            const videoSender = pc
              .getSenders()
              .find(
                (sender: any) => sender.track && sender.track.kind === "video"
              );
            if (videoSender) {
              videoSender.replaceTrack(null).catch(console.error);
            }
          });
        }
      }

      setIsVideoOn(newVideoState);

      // Update via socket
      if (socketRef.current) {
        socketRef.current.emit("participant-update", {
          roomId,
          participant: {
            id: userId,
            isVideoOn: newVideoState,
            isAudioOn,
            isScreenSharing,
          },
        });
      }

      // Update database
      if (isSupabaseConfigured()) {
        await supabase
          .from("participants")
          .update({ is_video_on: newVideoState })
          .eq("room_id", roomId)
          .eq("user_id", userId);
      }

      console.log(`Video toggled to: ${newVideoState ? "ON" : "OFF"}`);
    } catch (error: any) {
      console.error("Error toggling video:", error);
    }
  }, [
    localStream,
    isVideoOn,
    roomId,
    userId,
    isAudioOn,
    isScreenSharing,
    initializeAudioAnalysis,
  ]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      const newScreenState = !isScreenSharing;
      console.log(`Toggling screen share to: ${newScreenState ? "ON" : "OFF"}`);

      if (newScreenState) {
        // Start screen sharing
        console.log("Starting screen share...");
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // cursor: "always",
            displaySurface: "monitor",
          } as any,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        console.log("Screen stream obtained:", {
          videoTracks: screenStream.getVideoTracks().length,
          audioTracks: screenStream.getAudioTracks().length,
        });

        // Keep existing audio track from local stream
        const existingAudioTrack = localStream?.getAudioTracks()[0];
        const screenVideoTrack = screenStream.getVideoTracks()[0];

        // Create new stream with screen video and existing audio
        const combinedStream = new MediaStream();
        if (screenVideoTrack) {
          combinedStream.addTrack(screenVideoTrack);
        }
        if (existingAudioTrack) {
          combinedStream.addTrack(existingAudioTrack);
        }

        // Replace video track in all peer connections
        Object.values(peersRef.current).forEach((pc) => {
          const videoSender = pc
            .getSenders()
            .find((s: any) => s.track && s.track.kind === "video");
          if (videoSender && screenVideoTrack) {
            videoSender.replaceTrack(screenVideoTrack).catch(console.error);
          } else if (screenVideoTrack) {
            pc.addTrack(screenVideoTrack, combinedStream);
          }
        });

        // Update local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = combinedStream;
        }

        setLocalStream(combinedStream);
        setIsScreenSharing(true);

        // Handle screen share end (user clicks "Stop sharing" in browser)
        screenVideoTrack.onended = () => {
          console.log("Screen share ended by user");
          toggleScreenShare();
        };
      } else {
        // Stop screen sharing - switch back to camera
        console.log("Stopping screen share...");

        if (isVideoOn) {
          // Get camera stream back
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          const videoTrack = cameraStream.getVideoTracks()[0];
          const audioTrack = cameraStream.getAudioTracks()[0];

          // Replace tracks in peer connections
          Object.values(peersRef.current).forEach((pc) => {
            const videoSender = pc
              .getSenders()
              .find((s: any) => s.track && s.track.kind === "video");
            const audioSender = pc
              .getSenders()
              .find((s: any) => s.track && s.track.kind === "audio");

            if (videoSender && videoTrack) {
              videoSender.replaceTrack(videoTrack).catch(console.error);
            }
            if (audioSender && audioTrack) {
              audioSender.replaceTrack(audioTrack).catch(console.error);
            }
          });

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = cameraStream;
          }

          setLocalStream(cameraStream);
        } else {
          // Just audio stream
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          const audioTrack = audioStream.getAudioTracks()[0];

          // Replace audio track in peer connections
          Object.values(peersRef.current).forEach((pc) => {
            const audioSender = pc
              .getSenders()
              .find((s: any) => s.track && s.track.kind === "audio");

            if (audioSender && audioTrack) {
              audioSender.replaceTrack(audioTrack).catch(console.error);
            }
          });

          // Remove video track from peer connections
          Object.values(peersRef.current).forEach((pc) => {
            const videoSender = pc
              .getSenders()
              .find((s: any) => s.track && s.track.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(null).catch(console.error);
            }
          });

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }

          setLocalStream(audioStream);
        }

        setIsScreenSharing(false);
      }

      // Update via socket
      if (socketRef.current) {
        socketRef.current.emit("participant-update", {
          roomId,
          participant: {
            id: userId,
            isVideoOn,
            isAudioOn,
            isScreenSharing: newScreenState,
          },
        });
      }

      // Update database
      if (isSupabaseConfigured()) {
        await supabase
          .from("participants")
          .update({ is_screen_sharing: newScreenState })
          .eq("room_id", roomId)
          .eq("user_id", userId);
      }

      console.log(
        `Screen sharing toggled to: ${newScreenState ? "ON" : "OFF"}`
      );
    } catch (error: any) {
      console.error("Error toggling screen share:", error);
      // Reset state on error
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, roomId, userId, localStream, isVideoOn, isAudioOn]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      console.log("Initializing WebRTC...");

      // Initialize socket first
      const socket = initializeSocket();
      if (!socket) {
        console.error("Failed to initialize socket");
        return;
      }

      // Wait a bit for socket to connect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Then initialize media stream
      const stream = await initializeLocalStream();
      if (stream) {
        console.log("Local stream initialized, joining room...");
        await joinRoom();
      } else {
        console.warn(
          "Failed to initialize local stream, joining room anyway..."
        );
        await joinRoom();
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up WebRTC...");
      leaveRoom();
    };
  }, []);

  // Sync video element with stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;

      const playVideo = async () => {
        try {
          await localVideoRef.current?.play();
        } catch (error: any) {
          console.error("Error playing video:", error);
        }
      };

      playVideo();
    }
  }, [localStream]);

  // Listen for Supabase realtime events
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase not configured, skipping real-time subscriptions");
      return;
    }

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "signaling",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const signal = payload.new;
          if (signal.to_user === userId) {
            handleSignal({
              type: signal.signal_type,
              data: signal.signal_data,
              from: signal.from_user,
              to: signal.to_user,
              roomId: signal.room_id,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          // Handle participant changes
          if (
            payload.eventType === "INSERT" &&
            payload.new.user_id !== userId
          ) {
            setParticipants((prev) => [
              ...prev.filter((p) => p.id !== payload.new.user_id), // Remove if exists
              {
                id: payload.new.user_id,
                name: payload.new.name,
                avatar: payload.new.avatar,
                isScreenSharing: payload.new.is_screen_sharing,
                isVideoOn: payload.new.is_video_on,
                isAudioOn: payload.new.is_audio_on,
              },
            ]);
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== payload.old.user_id)
            );

            // Close peer connection
            if (peersRef.current[payload.old.user_id]) {
              peersRef.current[payload.old.user_id].close();
              delete peersRef.current[payload.old.user_id];
            }
          } else if (
            payload.eventType === "UPDATE" &&
            payload.new.user_id !== userId
          ) {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === payload.new.user_id
                  ? {
                      ...p,
                      isVideoOn: payload.new.is_video_on,
                      isAudioOn: payload.new.is_audio_on,
                      isScreenSharing: payload.new.is_screen_sharing,
                    }
                  : p
              )
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, userId, handleSignal]);

  return {
    participants,
    localStream,
    localVideoRef,
    isAudioOn,
    isVideoOn,
    isScreenSharing,
    isConnected,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveRoom,
    detectTalking,
  };
};
