import RoomClient from "./_components/RoomClient";

export async function generateStaticParams() {
  return [
    { id: "1" },
    { id: "2" },
    { id: "3" },
    { id: "demo" },
    { id: "test" },
    { id: "meeting" },
  ];
}

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomClient roomId={params.id} />;
}
