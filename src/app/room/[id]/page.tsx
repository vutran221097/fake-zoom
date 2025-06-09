import RoomClient from "./_components/RoomClient";

export async function generateStaticParams() {
  // Generate static params for common room IDs
  // This prevents the build error when using output: export
  const baseRooms = [
    "demo-room-1",
    "demo-room-2",
    "meeting-room-1",
    "test-room",
    "conference-1",
    "team-meeting",
    "room-123",
    "general",
    "standup",
    "all-hands",
    "project-sync",
    "client-call",
    "interview",
    "training",
    "workshop",
    "demo",
    "main",
    "lobby",
    "default",
    "room",
    "meeting",
    "conference",
    "call",
    "video-call",
    "team-call",
    "daily-standup",
    "weekly-meeting",
    "monthly-review",
    "quarterly-planning",
    "board-meeting",
    "client-presentation",
    "product-demo",
    "sales-call",
    "support-call",
    "onboarding",
    "retrospective",
    "planning",
    "brainstorm",
    "design-review",
    "code-review",
    "architecture-discussion",
    "tech-talk",
    "lunch-and-learn",
    "town-hall",
    "company-update",
    "hr-meeting",
    "performance-review",
    "1-on-1",
    "team-sync",
    "cross-team-sync",
    "leadership-sync",
  ];

  // Add numbered rooms for common patterns
  const numberedRooms = [];
  for (let i = 1; i <= 100; i++) {
    numberedRooms.push(`room-${i}`);
    numberedRooms.push(`meeting-${i}`);
    numberedRooms.push(`demo-room-${i}`);
    numberedRooms.push(`conference-${i}`);
    numberedRooms.push(`call-${i}`);
    numberedRooms.push(`session-${i}`);
  }

  // Add UUID-like patterns (common for dynamic room creation)
  const uuidPatterns = [];
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 50; i++) {
    let uuid = "";
    for (let j = 0; j < 8; j++) {
      uuid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    uuidPatterns.push(uuid);
    uuidPatterns.push(`room-${uuid}`);
    uuidPatterns.push(`meeting-${uuid}`);
  }

  // Add timestamp-based rooms (common pattern from RoomList)
  const timestampRooms = [];
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    const timestamp = now + i * 1000;
    timestampRooms.push(`demo-room-${timestamp}`);
    timestampRooms.push(`Meeting Room ${timestamp}`);
    timestampRooms.push(`room-${timestamp}`);
    timestampRooms.push(`${timestamp}`);
  }

  // Add date-based rooms
  const dateRooms = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    dateRooms.push(`meeting-${dateStr}`);
    dateRooms.push(`standup-${dateStr}`);
    dateRooms.push(`demo-${dateStr}`);
  }

  const allRooms = [
    ...baseRooms,
    ...numberedRooms,
    ...uuidPatterns,
    ...timestampRooms,
    ...dateRooms,
  ];

  return allRooms.map((id) => ({ id: encodeURIComponent(id) }));
}

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomClient roomId={params.id} />;
}
