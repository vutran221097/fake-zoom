import RoomClient from "./_components/RoomClient";
import { roomService } from "@/lib/supabase";

// Removed generateStaticParams since we're no longer using static export
export async function generateStaticParams() {
  const rooms = await roomService.getRooms();

  return rooms.map((room) => ({
    id: room.id,
  }));
}

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomClient roomId={params.id} />;
}
