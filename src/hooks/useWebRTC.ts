"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isScreenSharing: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  stream?: MediaStream;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  from: string;
  to: string;
  roomId: string;
}

export const useWebRTC = (roomId: string, userId: string, userName: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamsRef = useRef<{ [key: string]: MediaStream }>({});
  const channelRef = useRef<any>(null);

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
      const stream = await navigator.mediaDevices.getUserMedia({
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

      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      return null;
    }
  }, []);

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
      peerConnection.ontrack = (event) => {
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
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
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

  // Send signaling data through Supabase
  const sendSignal = useCallback(async (signal: SignalData) => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn("Supabase not configured, skipping signaling");
        return;
      }

      // Insert signal into Supabase
      const { error } = await supabase.from("signaling").insert({
        room_id: signal.roomId,
        from_user: signal.from,
        to_user: signal.to,
        signal_type: signal.type,
        signal_data: signal.data,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error sending signal:", error);
      }
    } catch (error) {
      console.error("Error sending signal:", error);
    }
  }, []);

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

            sendSignal({
              type: "answer",
              data: answer,
              from: userId,
              to: signal.from,
              roomId,
            });
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
      } catch (error) {
        console.error("Error handling signal:", error);
      }
    },
    [createPeerConnection, sendSignal, userId, roomId]
  );

  // Join room and establish connections
  const joinRoom = useCallback(async () => {
    try {
      if (!isSupabaseConfigured()) {
        console.warn("Supabase not configured, running in demo mode");
        setIsConnected(true);
        return;
      }

      // Create or get room
      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!existingRoom) {
        await supabase.from("rooms").insert({
          id: roomId,
          name: `Meeting Room ${roomId}`,
          is_active: true,
          participant_count: 0,
        });
      }

      // Join room in database
      const { error: joinError } = await supabase.from("participants").insert({
        room_id: roomId,
        user_id: userId,
        name: userName,
        is_video_on: isVideoOn,
        is_audio_on: isAudioOn,
        is_screen_sharing: isScreenSharing,
      });

      if (joinError) {
        console.error("Error joining room:", joinError);
        return;
      }

      // Get existing participants
      const { data: existingParticipants } = await supabase
        .from("participants")
        .select("*")
        .eq("room_id", roomId)
        .neq("user_id", userId);

      if (existingParticipants) {
        setParticipants(
          existingParticipants.map((p) => ({
            id: p.user_id,
            name: p.name,
            avatar: p.avatar,
            isScreenSharing: p.is_screen_sharing,
            isVideoOn: p.is_video_on,
            isAudioOn: p.is_audio_on,
          }))
        );

        // Create offers for existing participants
        for (const participant of existingParticipants) {
          const peerConnection = createPeerConnection(participant.user_id);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          sendSignal({
            type: "offer",
            data: offer,
            from: userId,
            to: participant.user_id,
            roomId,
          });
        }
      }

      setIsConnected(true);
    } catch (error) {
      console.error("Error joining room:", error);
    }
  }, [
    roomId,
    userId,
    userName,
    isVideoOn,
    isAudioOn,
    isScreenSharing,
    createPeerConnection,
    sendSignal,
  ]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    try {
      // Close all peer connections
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      // Remove from database
      if (isSupabaseConfigured()) {
        await supabase
          .from("participants")
          .delete()
          .eq("room_id", roomId)
          .eq("user_id", userId);

        // Update room participant count
        const { data: remainingParticipants } = await supabase
          .from("participants")
          .select("*")
          .eq("room_id", roomId);

        const participantCount = remainingParticipants?.length || 0;

        await supabase
          .from("rooms")
          .update({
            participant_count: participantCount,
            is_active: participantCount > 0,
          })
          .eq("id", roomId);
      }

      // Close realtime channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setIsConnected(false);
      setParticipants([]);
    } catch (error) {
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
    } catch (error) {
      console.error("Error toggling audio:", error);
    }
  }, [localStream, isAudioOn, roomId, userId]);

  // Toggle video - FIXED VERSION
  const toggleVideo = useCallback(async () => {
    try {
      const newVideoState = !isVideoOn;

      if (newVideoState) {
        // Turning video ON - recreate the video stream
        console.log("Turning video ON - recreating stream");

        const newStream = await navigator.mediaDevices.getUserMedia({
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

        // Stop old stream tracks
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop());
        }

        // Update local stream
        setLocalStream(newStream);

        // Update video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          await localVideoRef.current.play();
        }

        // Replace tracks in all peer connections
        Object.values(peersRef.current).forEach((pc) => {
          // Replace video track
          const videoSender = pc
            .getSenders()
            .find((sender) => sender.track && sender.track.kind === "video");
          if (videoSender && newStream.getVideoTracks()[0]) {
            videoSender.replaceTrack(newStream.getVideoTracks()[0]);
          }

          // Replace audio track
          const audioSender = pc
            .getSenders()
            .find((sender) => sender.track && sender.track.kind === "audio");
          if (audioSender && newStream.getAudioTracks()[0]) {
            audioSender.replaceTrack(newStream.getAudioTracks()[0]);
          }
        });
      } else {
        // Turning video OFF - just disable the track
        console.log("Turning video OFF");
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
          }
        }
      }

      setIsVideoOn(newVideoState);

      // Update database
      if (isSupabaseConfigured()) {
        await supabase
          .from("participants")
          .update({ is_video_on: newVideoState })
          .eq("room_id", roomId)
          .eq("user_id", userId);
      }

      console.log(`Video toggled to: ${newVideoState ? "ON" : "OFF"}`);
    } catch (error) {
      console.error("Error toggling video:", error);
      // If there's an error getting new stream, just disable the current track
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      }
    }
  }, [localStream, isVideoOn, roomId, userId]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      const newScreenState = !isScreenSharing;

      if (newScreenState) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        // Handle screen share end
        videoTrack.onended = () => {
          toggleScreenShare();
        };
      } else {
        // Stop screen sharing - switch back to camera
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
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }

        setLocalStream(cameraStream);
        setIsScreenSharing(false);
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
    } catch (error) {
      console.error("Error toggling screen share:", error);
    }
  }, [isScreenSharing, roomId, userId]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      const stream = await initializeLocalStream();
      if (stream) {
        await joinRoom();
      }
    };

    initialize();
  }, []);

  // Sync video element with stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;

      const playVideo = async () => {
        try {
          await localVideoRef.current?.play();
        } catch (error) {
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
        (payload) => {
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
        (payload) => {
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
  };
};
