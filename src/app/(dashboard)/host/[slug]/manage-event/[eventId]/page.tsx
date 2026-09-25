/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getHostEventDetailsAction,
  getHostEventMessagesAction,
} from "@/actions/host";
import { getHostID } from "@/lib/getHostId";
import { ProtectedRoute } from "@/components/protected-route";
import { EventDetailClient } from "@/components/host/event-detail-client";
import { shouldDeferHostEventMessagesForTab } from "@/lib/manage-event-first-paint";

interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

interface HostMessage {
  id: string;
  sender: string;
  text: string;
  senderType: "HOST";
  createdAt: string;
}

export default async function ManageEventDetailPage({
  params,
  searchParams,
}: Props) {
  const hostId = await getHostID();
  const { eventId } = await params;
  const sp = await searchParams;
  const deferMessages = shouldDeferHostEventMessagesForTab(sp.tab);

  const [{ data: eventDetails }, messagesResult] = await Promise.all([
    getHostEventDetailsAction(hostId!, eventId),
    deferMessages
      ? Promise.resolve({ data: [] as HostMessage[] })
      : getHostEventMessagesAction(hostId!, eventId),
  ]);
  const hostMessages = messagesResult.data;

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
    moneyFor,
    community,
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
        communityName={community?.name ?? null}
        eventBanner={eventBanner}
        moneyFor={moneyFor ?? ""}
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
