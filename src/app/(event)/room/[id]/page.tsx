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
import { EventRoomAccessGate } from "@/components/events/event-room-access-gate";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { getToken } from "@/lib/getToken";
import { getPrimaryOrigin } from "@/lib/site-config";
import { buildRoomShareUrl } from "@/lib/public-video-url";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { resolveRoomOgImage } from "@/lib/room-og-image";
import { buildBroadcastEventJsonLd } from "@/lib/structured-data";

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

/**
 * GENERATE METADATA
 * Handles SEO and Social Media tags for LinkedIn, Twitter, etc.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const trimmedId = typeof id === "string" ? id.trim() : id;

  const [eventRes, channelsRes] = await Promise.all([
    getEventByIdAction(trimmedId),
    getEventChannels(trimmedId),
  ]);

  const channels = channelsRes.data;
  const eventPayload = eventRes.data;
  if (!eventRes.success || !eventPayload) {
    return { title: "Event Not Found" };
  }

  const event = eventPayload;
  const pageUrl = buildRoomShareUrl(trimmedId);

  const defaultContent = (channels as EventRoomVideoChannel[])?.find(
    channel => channel.isDefault === true
  );

  const imageUrl = resolveRoomOgImage(
    defaultContent?.url,
    event.eventBanner ?? ""
  );

  const title = `Join ${event.eventName} hosted by ${event.hostName?.split(" ")[0]} on Tipmanna 💎⚡`;

  const description = `Support the event, watch live, and send paid engagements. Experience live interaction and make an impact in real-time.`;

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "TipManna",
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: `Poster for ${event.eventName}`,
              },
            ],
          }
        : {}),
      type: "website",
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventRoomPage({ params }: Props) {
  const { id } = await params;
  const trimmedId = typeof id === "string" ? id.trim() : id;
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
    timeZone,
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
    venueName,
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
    eventDescription,
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

  const defaultContent = (Array.isArray(channels) ? channels : []).find(
    (c: EventRoomVideoChannel) => c.isDefault === true
  );
  const roomOgImage = resolveRoomOgImage(
    defaultContent?.url,
    eventBanner ?? ""
  );

  const broadcastJsonLd =
    eventDate && startTime
      ? buildBroadcastEventJsonLd({
          title: eventName,
          description: eventDescription ?? undefined,
          startDate: `${eventDate}T${startTime}`,
          url: eventUrl,
          image: roomOgImage || null,
          organizerName: organizationName ?? hostName ?? undefined,
        })
      : null;

  return (
    <>
      {broadcastJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(broadcastJsonLd) }}
        />
      ) : null}
      <ClientErrorBoundary>
        <EventRoomAccessGate eventId={eventId}>
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
            timeZone={timeZone ?? "Europe/London"}
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
            venueName={venueName ?? ""}
            venueLocation={venueLocation ?? ""}
            activities={activities ?? []}
            eventDescription={eventDescription ?? ""}
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
          />
        </EventRoomAccessGate>
      </ClientErrorBoundary>

      {!approved && (
        <div
          className={`${OVERLAY_Z_INDEX} fixed inset-0 flex w-full items-center justify-center bg-black/50 backdrop-blur-md`}
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
              Your content room is locked and pending approval. It cannot be
              accessed yet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
