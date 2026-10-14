import { ProtectedRoute } from "@/components/protected-route";
import { HostEventBroadcastClient } from "@/components/host/host-event-broadcast-client";
import { getHostEventDetailsAction } from "@/actions/host";
import { getHostID } from "@/lib/getHostId";

interface Props {
  params: Promise<{ slug: string; eventId: string }>;
}

export default async function HostEventBroadcastPage({ params }: Props) {
  const hostId = await getHostID();
  const { slug, eventId } = await params;
  const { data: eventDetails } = await getHostEventDetailsAction(hostId!, eventId);
  const details = eventDetails as {
    eventName?: string;
    channels?: { id: string }[];
  };

  return (
    <ProtectedRoute>
      <HostEventBroadcastClient
        hostSlug={slug}
        eventId={eventId}
        eventName={details?.eventName ?? "Event"}
        eventChannelId={details?.channels?.[0]?.id}
      />
    </ProtectedRoute>
  );
}
