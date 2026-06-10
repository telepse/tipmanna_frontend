/* eslint-disable @typescript-eslint/no-explicit-any */
// Lib imports

import type { Metadata } from "next";
import Image from "next/image";

// Actions import
import {
  getAmountTippedByUser,
  getEventByIdAction,
  getEventChannels,
  type EventByIdData,
} from "@/actions/events";
import { getMessagesByEventAction } from "@/actions/messages";
import { EventRoomClient } from "@/components/events/event-room-client";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import { getToken } from "@/lib/getToken";
import { getPublicFrontendOrigin } from "@/lib/site-config";
import { buildRoomShareUrl } from "@/lib/public-video-url";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

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
  const eventRes = await getEventByIdAction(trimmedId);
  const eventPayload = eventRes.data;
  if (!eventRes.success || !eventPayload) {
    return { title: "Event Not Found" };
  }

  const event = eventPayload;
  const baseUrl = getPublicFrontendOrigin();

  // Clean background path logic
  const cleanBackground = event.eventBackground?.startsWith("/")
    ? event.eventBackground
    : `/${event.eventBackground}`;

  const imageUrl = event.eventBackground
    ? `${baseUrl}${cleanBackground}`
    : `${baseUrl}/events/together.png`;

  // Fix: Ensure description is > 100 characters for LinkedIn
  const orgName = event.organizationName ?? "the host";
  let description = `Join ${event.eventName} hosted by ${orgName}. Support the event, watch live, and tip your favorite characters.`;

  if (description.length < 100) {
    description += ` Experience a live interactive event where you can engage with the community and make an impact in real-time.`;
  }

  return {
    metadataBase: new URL(baseUrl),
    title: event.eventName,
    description: description,
    openGraph: {
      title: event.eventName,
      description: description,
      url: `/room/${trimmedId}`,
      siteName: "TipManna",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Poster for ${event.eventName}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.eventName,
      description: description,
      images: [imageUrl],
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

  console.log(eventRes.data);

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
        />
      </ClientErrorBoundary>

      {/* Lock overlay if not approved */}
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
              Your content room is locked and pending approval. It cannot be
              accessed yet.
            </p>
          </div>
        </div>
      )}

      {/* {approved && (
        <div className={`${OVERLAY_Z_INDEX} absolute inset-0 flex w-full items-center justify-center bg-black/50 shadow-md`}>
          <div className="flex max-w-sm flex-col items-center justify-center gap-6 rounded-md bg-white p-6 text-center relative border border-black m-4">
            <Settings className="size-20 text-primary" />

            <button type="button" className="absolute top-4 right-4 cursor-pointer hover:bg-black hover:text-white rounded-full p-1">
              <X />
            </button>

            <h2 className="text-2xl font-bold">You are now a cohost</h2>
            <p className="text-sm leading-loose">
              You can click the settings icon in the message section to start managing the content room.
            </p>
          </div>
        </div>
      )} */}
    </>
  );
}
