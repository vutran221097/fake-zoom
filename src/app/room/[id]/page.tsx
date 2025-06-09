import RoomClient from "./_components/RoomClient";

// Removed generateStaticParams since we're no longer using static export

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomClient roomId={params.id} />;
}
