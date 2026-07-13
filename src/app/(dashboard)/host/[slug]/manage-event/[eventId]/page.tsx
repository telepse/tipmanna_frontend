/* eslint-disable @typescript-eslint/no-explicit-any */
import { getHostEventDetailsAction } from "@/actions/host";
import { getHostID } from "@/lib/getHostId";
import { ProtectedRoute } from "@/components/protected-route";
import { getToken } from "@/lib/getToken";
import { EventDetailClient } from "@/components/host/event-detail-client";

interface Props {
  params: Promise<{ eventId: string }>;
}

export default async function ManageEventDetailPage({ params }: Props) {
  const hostId = await getHostID();
  const token = await getToken();
  const { eventId } = await params;

  const { data } = await getHostEventDetailsAction(hostId!, eventId, token);

  const {
    eventName,
    eventDescription,
    organizationName,
    hostName,
    eventType,
    eventDate,
    startTime,
    endTime,
    cohosts,
    performers,
    projects,
    amountToRaise,
    venueLocation,
    venueName,
    activities,
    resourcesRequested,
    tipUsageDisclosure,
    channels: contents,
    host: { email: hostEmail },
  } = data as any;

  console.log(data);

  return (
    <ProtectedRoute>
      <EventDetailClient
        eventId={eventId}
        eventName={eventName}
        eventDescription={eventDescription}
        organizationName={organizationName}
        hostName={hostName}
        eventType={eventType}
        eventDate={eventDate}
        venueLocation={venueLocation}
        venueName={venueName}
        startTime={startTime}
        endTime={endTime}
        performers={performers}
        projects={projects}
        cohosts={cohosts}
        amountToRaise={amountToRaise}
        activities={activities}
        resourcesRequested={resourcesRequested}
        tipUsageDisclosure={tipUsageDisclosure}
        contents={contents}
        hostEmail={hostEmail}
      />
    </ProtectedRoute>
  );
}
