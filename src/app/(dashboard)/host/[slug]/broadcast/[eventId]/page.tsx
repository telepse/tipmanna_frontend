import { ProtectedRoute } from "@/components/protected-route";
import { HostEventBroadcastClient } from "@/components/host/host-event-broadcast-client";
import { getHostEventDetailsAction } from "@/actions/host";
import { getHostID } from "@/lib/getHostId";
import { pickNativeBroadcastEventChannelId } from "@/lib/native-broadcast-channel";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

interface Props {
  params: Promise<{ slug: string; eventId: string }>;
}

export default async function HostEventBroadcastPage({ params }: Props) {
  const hostId = await getHostID();
  const { slug, eventId } = await params;
  const { data: eventDetails } = await getHostEventDetailsAction(
    hostId!,
    eventId
  );
  const details = eventDetails as {
    eventName?: string;
    channels?: EventRoomVideoChannel[];
  };
  const nativeBroadcastChannelId = pickNativeBroadcastEventChannelId(
    details?.channels ?? []
  );

  return (
    <ProtectedRoute>
      <HostEventBroadcastClient
        hostSlug={slug}
        eventId={eventId}
        eventName={details?.eventName ?? "Event"}
        eventChannelId={nativeBroadcastChannelId}
      />
    </ProtectedRoute>
  );
}
