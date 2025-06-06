import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
SQL SCHEMA FOR SUPABASE DATABASE:

-- Create rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  participant_count INTEGER DEFAULT 0,
  created_by UUID
);

-- Create participants table
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  is_video_on BOOLEAN DEFAULT TRUE,
  is_audio_on BOOLEAN DEFAULT TRUE,
  is_screen_sharing BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_participants_room_id ON participants(room_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_rooms_created_at ON rooms(created_at);
CREATE INDEX idx_rooms_is_active ON rooms(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms table
CREATE POLICY "Anyone can view rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rooms" ON rooms FOR DELETE USING (true);

-- Create policies for participants table
CREATE POLICY "Anyone can view participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Anyone can create participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update participants" ON participants FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete participants" ON participants FOR DELETE USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

*/

// Types for our database
export interface Room {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
  participant_count: number;
  created_by?: string;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  avatar?: string;
  is_video_on: boolean;
  is_audio_on: boolean;
  is_screen_sharing: boolean;
  joined_at: string;
}

// Room management functions
export const roomService = {
  // Get all rooms
  async getRooms(): Promise<Room[]> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching rooms:", error);
      return [];
    }

    return data || [];
  },

  // Get room by ID
  async getRoom(id: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching room:", error);
      return null;
    }

    return data;
  },

  // Create new room
  async createRoom(name: string, userId?: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        name,
        is_active: false,
        participant_count: 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating room:", error);
      return null;
    }

    return data;
  },

  // Update room status
  async updateRoom(id: string, updates: Partial<Room>): Promise<Room | null> {
    const { data, error } = await supabase
      .from("rooms")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating room:", error);
      return null;
    }

    return data;
  },

  // Delete room
  async deleteRoom(id: string): Promise<boolean> {
    const { error } = await supabase.from("rooms").delete().eq("id", id);

    if (error) {
      console.error("Error deleting room:", error);
      return false;
    }

    return true;
  },
};

// Participant management functions
export const participantService = {
  // Get participants for a room
  async getParticipants(roomId: string): Promise<Participant[]> {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching participants:", error);
      return [];
    }

    return data || [];
  },

  // Join room
  async joinRoom(
    roomId: string,
    userId: string,
    name: string,
  ): Promise<Participant | null> {
    const { data, error } = await supabase
      .from("participants")
      .insert({
        room_id: roomId,
        user_id: userId,
        name,
        is_video_on: true,
        is_audio_on: true,
        is_screen_sharing: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error joining room:", error);
      return null;
    }

    // Update room participant count and status
    await this.updateRoomParticipantCount(roomId);

    return data;
  },

  // Leave room
  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error leaving room:", error);
      return false;
    }

    // Update room participant count
    await this.updateRoomParticipantCount(roomId);

    return true;
  },

  // Update participant status
  async updateParticipant(
    id: string,
    updates: Partial<Participant>,
  ): Promise<Participant | null> {
    const { data, error } = await supabase
      .from("participants")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating participant:", error);
      return null;
    }

    return data;
  },

  // Update room participant count
  async updateRoomParticipantCount(roomId: string): Promise<void> {
    const participants = await this.getParticipants(roomId);
    const count = participants.length;

    await supabase
      .from("rooms")
      .update({
        participant_count: count,
        is_active: count > 0,
      })
      .eq("id", roomId);
  },
};
