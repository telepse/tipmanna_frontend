/* eslint-disable @typescript-eslint/no-explicit-any */
// Lib imports
import { getToken } from "@/lib/getToken";
import type { Metadata } from "next";

// Actions import
import {
  getAllEventChannels,
  getAllTopTippers,
  getAmountTippedByUser,
  getEventByIdAction,
  getEventChannels,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getMessagesByEventAction } from "@/actions/messages";
import { EventRoomClient } from "@/components/events/event-room-client";
import { getAllCausesAction } from "@/actions/home";
import { getLatestContents, getMostTippedContents } from "@/actions/contents";

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
  const { data: event } = await getEventByIdAction(id);

  if (!event) return { title: "Event Not Found" };

  const baseUrl =
    process.env.NEXT_PUBLIC_FRONTEND_APP_URL || "https://tipmanna.com";

  // Clean background path logic
  const cleanBackground = event.eventBackground?.startsWith("/")
    ? event.eventBackground
    : `/${event.eventBackground}`;

  const imageUrl = event.eventBackground
    ? `${baseUrl}${cleanBackground}`
    : `${baseUrl}/events/together.png`;

  // Fix: Ensure description is > 100 characters for LinkedIn
  let description = `Join ${event.eventName} hosted by ${event.organizationName}. Support the event, watch live, and tip your favorite characters.`;

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
      url: `/room/${id}`,
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
  const token = await getToken();

  // Fetch everything else in parallel
  const [
    { data: event },
    { data: messages },
    { data: iTipped },
    { data: channels },
    { data: tipperEvents },
    { data: tipperTotal },
    { data: causes },
    { data: contents },
    { data: tippers },
    { data: latestContents },
    { data: mostTippedContents },
  ] = await Promise.all([
    getEventByIdAction(id),
    getMessagesByEventAction(id),
    getAmountTippedByUser(id, token!),
    getEventChannels(id),
    getTippedEventsForTipper(token!),
    getTotalAmountTippedByTipper(token!),
    getAllCausesAction(),
    getAllEventChannels(),
    getAllTopTippers(),
    getLatestContents(),
    getMostTippedContents(),
  ]);

  if (!event) return <div>Event not found</div>;

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
    host: { id: hostId, fullName, username },
    approved,
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

  const eventUrl = `${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/room/${eventId}`;

  const isEventOwner = hostId;

  return (
    <>
      <EventRoomClient
        eventId={eventId}
        eventName={eventName}
        organizationName={organizationName}
        hostName={hostName}
        fullName={fullName}
        username={username}
        eventDate={eventDate}
        startTime={startTime}
        endTime={endTime}
        liveVideoLink={liveVideoLink}
        defaultAdminVideo={defaultAdminVideo}
        amountToRaise={amountToRaise}
        initialNumOfTips={initialNumOfTips}
        initialAmountRaised={initialAmountRaised}
        messages={messages}
        iTipped={iTipped}
        tippingCharacters={allCharacters}
        eventCode={eventCode}
        eventSlug={eventSlug}
        eventBackground={eventBackground}
        eventBanner={eventBanner}
        venueLocation={venueLocation}
        totalAttendees={totalAttendees}
        hideProgressBarAmount={hideProgressBarAmount}
        showLatestAmount={showLatestAmount}
        characterSets={eventCharacterSets}
        initialLatestTipAmount={initialLatestTipAmount}
        tipUsageDisclosure={tipUsageDisclosure}
        eventUrl={eventUrl}
        channels={channels}
        tipperEvents={tipperEvents}
        tipperTotal={tipperTotal}
        causes={causes}
        isEventOwner={isEventOwner}
        contents={contents}
        tippers={tippers}
        latestContents={latestContents}
        mostTippedContents={mostTippedContents}
      />

      {/* Lock overlay if not approved */}
      {!approved && (
        <div className="absolute inset-0 z-[999999999] flex items-center justify-center bg-black/50 backdrop-blur-md">
          <div className="rounded-lg bg-black/70 p-6 text-center text-white">
            <p className="text-2xl font-bold">Event Locked</p>
            <p className="mt-2">
              This event is pending approval and cannot be accessed yet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
