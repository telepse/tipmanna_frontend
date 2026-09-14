/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metadata } from "next";
import Image from "next/image";
import {
  getAmountTippedByUser,
  getEventByIdAction,
  getEventChannels,
  type EventByIdData,
} from "@/actions/events";
import { getMessagesByEventAction } from "@/actions/messages";
import { EventRoomClient } from "@/components/events/event-room-client";
import { PrivateEventRoomBlocked } from "@/components/events/event-room-access-gate";
import { getEventRoomAccessAction } from "@/actions/events";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { getToken } from "@/lib/getToken";
import { buildRoomShareUrl } from "@/lib/public-video-url";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { isEventRoomAccessDenied } from "@/lib/event-room-access";

interface Props {
  params: Promise<{ id: string }>;
}

interface Character {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  styleName: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trimmedId = typeof id === "string" ? id.trim() : id;

  const accessRes = await getEventRoomAccessAction(trimmedId);
  const access =
    accessRes.success && accessRes.data
      ? (accessRes.data as {
          accessMode?: "public" | "invite_only";
          allowed?: boolean;
        })
      : null;
  if (isEventRoomAccessDenied(access ?? undefined)) {
    return { title: "Private event room" };
  }

  const eventRes = await getEventByIdAction(trimmedId);
  if (!eventRes.success || !eventRes.data) {
    return { title: "Screen display" };
  }
  return {
    title: `${eventRes.data.eventName} — Screen display`,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Opens the fundraise / screen display lightbox immediately (approval email link). */
export default async function EventRoomScreenPage({ params }: Props) {
  const { id } = await params;
  const trimmedId = typeof id === "string" ? id.trim() : id;

  const accessRes = await getEventRoomAccessAction(trimmedId);
  const access =
    accessRes.success && accessRes.data
      ? (accessRes.data as {
          accessMode?: "public" | "invite_only";
          allowed?: boolean;
        })
      : null;

  if (isEventRoomAccessDenied(access ?? undefined)) {
    return <PrivateEventRoomBlocked />;
  }

  const token = await getToken();

  const [eventRes, messagesRes, tippedRes, channelsRes] = await Promise.all([
    getEventByIdAction(trimmedId),
    getMessagesByEventAction(trimmedId),
    getAmountTippedByUser(trimmedId, token),
    getEventChannels(trimmedId),
  ]);

  const eventPayload = eventRes.data;
  const messages = messagesRes.data;
  const iTipped = tippedRes.data ?? 0;
  const channels = channelsRes.data;

  if (!eventRes.success || !eventPayload) return <div>Event not found</div>;

  const event: EventByIdData = eventPayload;
  const host = event.host;
  const hostId = host?.id ?? "";
  const fullName = host?.fullName ?? "";
  const username = host?.username ?? "";

  const {
    id: eventId,
    eventName,
    eventDate,
    startTime,
    endTime,
    amountToRaise,
    amountRaised: initialAmountRaised,
    numOfTips: initialNumOfTips,
    liveVideoLink,
    defaultAdminVideo,
    hostName,
    organizationName,
    eventCode,
    eventSlug,
    eventBackground,
    eventBanner,
    venueLocation,
    hideProgressBarAmount,
    showLatestAmount,
    totalAttendees,
    latestTipAmount: initialLatestTipAmount,
    characterSets: eventCharacterSets,
    tipUsageDisclosure,
    approved,
    performers,
    projects,
    contributionType,
    EventSession,
    eventType,
    activities,
  } = event;

  const safeCharacterSets = Array.isArray(eventCharacterSets)
    ? eventCharacterSets
    : [];

  const allCharacters = safeCharacterSets.flatMap((set: any) =>
    Array.isArray(set?.characters)
      ? set.characters.map((char: Character) => ({
          id: char.id,
          name: char.name,
          iconUrl: char.iconUrl,
          price: char.price,
          styleName: char.styleName,
        }))
      : []
  );

  const eventUrl = buildRoomShareUrl(eventId);
  const isEventOwner = hostId;

  return (
    <>
      <ClientErrorBoundary>
        <EventRoomClient
          eventId={eventId}
          eventName={eventName}
          organizationName={organizationName ?? ""}
          hostName={hostName ?? ""}
          fullName={fullName}
          username={username}
          eventDate={eventDate ?? ""}
          startTime={startTime ?? ""}
          endTime={endTime ?? ""}
          liveVideoLink={liveVideoLink ?? ""}
          defaultAdminVideo={defaultAdminVideo ?? ""}
          amountToRaise={amountToRaise ?? 0}
          initialNumOfTips={initialNumOfTips ?? 0}
          initialAmountRaised={initialAmountRaised ?? 0}
          messages={Array.isArray(messages) ? messages : []}
          iTipped={iTipped}
          tippingCharacters={allCharacters}
          eventCode={eventCode ?? ""}
          eventSlug={eventSlug ?? ""}
          eventBackground={eventBackground ?? ""}
          eventBanner={eventBanner ?? ""}
          venueLocation={venueLocation ?? ""}
          totalAttendees={totalAttendees ?? 0}
          hideProgressBarAmount={hideProgressBarAmount ?? false}
          showLatestAmount={showLatestAmount ?? false}
          characterSets={
            Array.isArray(eventCharacterSets) ? eventCharacterSets : []
          }
          initialLatestTipAmount={initialLatestTipAmount ?? 0}
          tipUsageDisclosure={
            Array.isArray(tipUsageDisclosure) ? tipUsageDisclosure : []
          }
          eventUrl={eventUrl}
          isEventOwner={isEventOwner}
          channels={Array.isArray(channels) ? channels : []}
          performers={Array.isArray(performers) ? performers : []}
          projects={Array.isArray(projects) ? projects : []}
          contributionType={contributionType ?? ""}
          EventSession={Array.isArray(EventSession) ? EventSession : []}
          eventEventType={eventType}
          forceScreenOpen
          activities={activities}
        />
      </ClientErrorBoundary>

      {!approved && (
        <div
          className={`${OVERLAY_Z_INDEX} absolute inset-0 flex w-full items-center justify-center bg-black/50 backdrop-blur-md`}
        >
          <div className="flex max-w-sm flex-col items-center justify-center gap-6 rounded-md bg-white/50 p-6 text-center">
            <Image
              src="/assets/lock.png"
              alt="Lock"
              width={100}
              height={100}
              className="object-cover"
            />
            <h2 className="text-2xl font-bold">Content Room Locked</h2>
            <p className="text-sm leading-loose">
              Your content room is locked and pending approval.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
