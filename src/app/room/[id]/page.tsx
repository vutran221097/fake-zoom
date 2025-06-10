import RoomClient from "./_components/RoomClient";
import { roomService, isSupabaseConfigured } from "@/lib/supabase";

// Generate static params for static export
export async function generateStaticParams() {
  try {
    // Only generate static params if Supabase is configured
    if (isSupabaseConfigured()) {
      const rooms = await roomService.getRooms();
      return rooms.map((room) => ({
        id: room.id,
      }));
    }

    // Return empty array if Supabase is not configured
    return [];
  } catch (error) {
    console.warn("Failed to generate static params:", error);
    // Return empty array on error to allow build to continue
    return [];
  }
}

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomClient roomId={params.id} />;
}
