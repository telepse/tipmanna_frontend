/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getEventByIdAction, getEventRoomAccessAction } from "@/actions/events";
import { ChannelClient } from "@/components/events/channel-client";
import { PrivateEventRoomBlocked } from "@/components/events/event-room-access-gate";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import {
  applyVideoDeepLinkQuery,
  buildChannelShareUrl,
  parseChannelSearchParam,
  pickInitialChannelContent,
} from "@/lib/public-video-url";
import { getPrimaryOrigin } from "@/lib/site-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isEventRoomAccessDenied } from "@/lib/event-room-access";
import {
  buildOgImageMetadata,
  resolveVideoOgImageUrl,
} from "@/lib/video-og-image";
import { buildVideoObjectJsonLd } from "@/lib/structured-data";
import { unwrapContentChannelList } from "@/lib/content-channel-payload";
import { getCachedContentChannelForPage } from "@/lib/cached-content-channel";

export interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ChannelData {
  id?: string;
  title?: string;
  url?: string;
  description?: string;
  createdAt?: string;
  restricted?: boolean;
  isDefault?: boolean;
  event: {
    hostName: string;
    id?: string;
  };
}

/**
 * GENERATE METADATA
 * Handles SEO and Social Media tags for LinkedIn, Twitter, etc.
 */
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { eventId } = await params;
  const sp = await searchParams;
  const initialChannelId = parseChannelSearchParam(sp);

  const accessRes = await getEventRoomAccessAction(eventId);
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

  const res = await getCachedContentChannelForPage(eventId);
  const list = unwrapContentChannelList(res.data) as ChannelData[];
  const defaultChannel = pickInitialChannelContent(list, initialChannelId);
  const hostName =
    list[0]?.event?.hostName ?? defaultChannel?.event?.hostName ?? "";
  const creatorFirstName = hostName.split(" ")[0] || "creator";
  const pageUrl = buildChannelShareUrl({
    eventId,
    channelId: initialChannelId ?? undefined,
  });
  const ogImage = resolveVideoOgImageUrl(defaultChannel?.url);
  const imageMeta = buildOgImageMetadata(ogImage);

  const title =
    defaultChannel?.title && creatorFirstName
      ? `Watch "${defaultChannel.title}" by ${creatorFirstName} ⚡💎`
      : `Watch & support ${creatorFirstName} ⚡💎`;

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title,
    description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
      url: pageUrl,
      type: "video.other",
      ...imageMeta.openGraph,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
      ...imageMeta.twitter,
    },
  };
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const sp = await searchParams;
  const initialChannelId = parseChannelSearchParam(sp);

  const accessRes = await getEventRoomAccessAction(eventId);
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

  const [
    contentsRes,
    { data: characters },
    { data: globalCharacterSets },
    eventRes,
  ] = await Promise.all([
    getCachedContentChannelForPage(eventId),
    getCharactersForTipping(),
    getAllCharacterSets(),
    getEventByIdAction(eventId),
  ]);

  const list = unwrapContentChannelList(contentsRes.data) as ChannelData[];

  const eventCatalog = parseEventCharacterCatalog(
    eventRes.success ? eventRes.data?.characterSets : []
  );
  const characterSets =
    eventCatalog.characterSets.length > 0
      ? eventCatalog.characterSets
      : Array.isArray(globalCharacterSets)
        ? globalCharacterSets
        : [];
  const tippingCharacters =
    eventCatalog.tippingCharacters.length > 0
      ? eventCatalog.tippingCharacters
      : Array.isArray(characters)
        ? characters
        : [];

  if (!eventId) return <div>Channel not found</div>;

  const canonicalEventId = list[0]?.event?.id;
  if (canonicalEventId && canonicalEventId !== eventId) {
    const q = new URLSearchParams();
    applyVideoDeepLinkQuery(q, initialChannelId);
    redirect(
      `/channel/${canonicalEventId}${q.toString() ? `?${q.toString()}` : ""}`
    );
  }

  const playable = list.filter((c: any) => !c?.restricted);
  if (list.length > 0 && playable.length === 0) {
    const cid = (list[0] as { community?: { id: string } })?.community?.id;
    if (cid) {
      redirect(
        `/restricted/${cid}?next=${encodeURIComponent(`/channel/${eventId}`)}`
      );
    }
  }

  const primary = pickInitialChannelContent(list, initialChannelId);
  const videoJsonLd =
    primary?.title && primary.event?.hostName
      ? buildVideoObjectJsonLd({
          title: primary.title,
          hostName: primary.event.hostName,
          url: buildChannelShareUrl({
            eventId,
            channelId: initialChannelId ?? undefined,
          }),
          videoUrl: primary.url,
          description: (primary as { description?: string }).description,
          uploadDate: (primary as { createdAt?: string }).createdAt,
        })
      : null;

  return (
    <>
      {videoJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
      ) : null}
      <div className="flex h-screen flex-col items-center justify-center">
        <ChannelClient
          contents={playable.length ? playable : list}
          characters={tippingCharacters as any[]}
          characterSets={characterSets as any[]}
          eventId={eventId}
          initialChannelId={initialChannelId}
        />
      </div>
    </>
  );
}
