/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getHostEventDetailsAction,
  getHostEventMessagesAction,
} from "@/actions/host";
import { getHostID } from "@/lib/getHostId";
import { ProtectedRoute } from "@/components/protected-route";
import { getToken } from "@/lib/getToken";
import { EventDetailClient } from "@/components/host/event-detail-client";

interface Props {
  params: Promise<{ eventId: string }>;
}

interface HostMessage {
  id: string;
  sender: string;
  text: string;
  senderType: "HOST";
  createdAt: string;
}

export default async function ManageEventDetailPage({ params }: Props) {
  const hostId = await getHostID();
  const token = await getToken();
  const { eventId } = await params;

  const { data: eventDetails } = await getHostEventDetailsAction(
    hostId!,
    eventId,
    token
  );
  const { data: hostMessages } = await getHostEventMessagesAction(
    hostId!,
    eventId,
    token
  );
  // const [data, hostMessages] = await Promise.all([
  //   getHostEventDetailsAction(hostId!, eventId, token),
  //   getHostEventMessagesAction(hostId!, eventId, token),
  // ]);

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
    submissionKind,
    host: { email: hostEmail },
  } = eventDetails as any;

  console.log("eventDetails", eventDetails);
  console.log("hostMessages", hostMessages);

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
        initialHostMessages={hostMessages as HostMessage[]}
        submissionKind={submissionKind}
      />
    </ProtectedRoute>
  );
}
