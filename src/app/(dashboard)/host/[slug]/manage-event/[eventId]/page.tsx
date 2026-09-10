/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getHostEventDetailsAction,
  getHostEventMessagesAction,
} from "@/actions/host";
import { getHostID } from "@/lib/getHostId";
import { ProtectedRoute } from "@/components/protected-route";
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
  const { eventId } = await params;

  const { data: eventDetails } = await getHostEventDetailsAction(
    hostId!,
    eventId
  );
  const { data: hostMessages } = await getHostEventMessagesAction(
    hostId!,
    eventId
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
    timeZone,
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
    thankYouMessage,
    eventBanner,
    host: { email: hostEmail },
  } = eventDetails as any;

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
        timeZone={timeZone}
        performers={performers}
        projects={projects}
        cohosts={cohosts}
        amountToRaise={amountToRaise}
        thankYouMessage={thankYouMessage}
        eventBanner={eventBanner}
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
