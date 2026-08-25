/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getContentChannelAction } from "@/actions/contents";
import { getEventByIdAction } from "@/actions/events";
import { ChannelClient } from "@/components/events/channel-client";
import { ActionResult } from "@/lib/action-fetch";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import {
  applyVideoDeepLinkQuery,
  parseChannelSearchParam,
  pickInitialChannelContent,
} from "@/lib/public-video-url";
import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  buildOgImageMetadata,
  resolveVideoOgImageUrl,
} from "@/lib/video-og-image";

export interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ChannelData {
  id?: string;
  url?: string;
  isDefault?: boolean;
  event: {
    hostName: string;
  };
}

function unwrapChannelList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    "formattedContents" in data &&
    Array.isArray((data as { formattedContents?: unknown[] }).formattedContents)
  ) {
    return (data as { formattedContents: any[] }).formattedContents;
  }
  return [];
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

  const res = (await getContentChannelAction(eventId)) as ActionResult<
    ChannelData[] | { formattedContents: ChannelData[] }
  >;
  const list = unwrapChannelList(res.data);
  const defaultChannel = pickInitialChannelContent(list, initialChannelId);
  const hostName = list[0]?.event?.hostName ?? "";
  const creatorFirstName = hostName.split(" ")[0];
  const pageUrl = getPublicAbsoluteUrl(`/channel/${eventId}`);
  const ogImage = resolveVideoOgImageUrl(defaultChannel?.url);
  const imageMeta = buildOgImageMetadata(ogImage);

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title: `Watch & support ${creatorFirstName} ⚡💎`,
    description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `Watch & support ${creatorFirstName} ⚡💎`,
      description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
      url: pageUrl,
      type: "video.other",
      ...imageMeta.openGraph,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: `Watch & support ${creatorFirstName} ⚡💎`,
      description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
      ...imageMeta.twitter,
    },
  };
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const sp = await searchParams;
  const initialChannelId = parseChannelSearchParam(sp);

  const [
    contentsRes,
    { data: characters },
    { data: globalCharacterSets },
    eventRes,
  ] = await Promise.all([
    getContentChannelAction(eventId),
    getCharactersForTipping(),
    getAllCharacterSets(),
    getEventByIdAction(eventId),
  ]);

  const list = unwrapChannelList(contentsRes.data);

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

  const canonicalEventId = (list[0] as { event?: { id?: string } } | undefined)
    ?.event?.id;
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

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <ChannelClient
        contents={playable.length ? playable : list}
        characters={tippingCharacters as any[]}
        characterSets={characterSets as any[]}
        eventId={eventId}
        initialChannelId={initialChannelId}
      />
    </div>
  );
}
