import { EventRoomInviteAcceptClient } from "@/components/events/event-room-invite-accept-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventRoomInvitePage({ params }: Props) {
  const { id } = await params;
  return <EventRoomInviteAcceptClient eventId={id} />;
}
