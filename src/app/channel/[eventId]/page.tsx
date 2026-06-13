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
import { parseChannelSearchParam } from "@/lib/public-video-url";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ChannelData {
  event: {
    hostName: string;
  };
}

/**
 * GENERATE METADATA
 * Handles SEO and Social Media tags for LinkedIn, Twitter, etc.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;

  // fetch creator data
  const res = (await getContentChannelAction(eventId)) as ActionResult<
    ChannelData[]
  >;
  const hostName = res.data?.[0]?.event?.hostName ?? "";
  const creatorFirstName = hostName.split(" ")[0];

  return {
    title: `Watch & support ${creatorFirstName} ⚡💎`,
    description: `Discover videos, join live conversations, and support ${creatorFirstName} through realtime visible participation on Tipmanna.`,
  };
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const sp = await searchParams;
  const initialChannelId = parseChannelSearchParam(sp);

  const [
    { data: contents },
    { data: characters },
    { data: globalCharacterSets },
    eventRes,
  ] = await Promise.all([
    getContentChannelAction(eventId),
    getCharactersForTipping(),
    getAllCharacterSets(),
    getEventByIdAction(eventId),
  ]);

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

  const list = Array.isArray(contents as any[]) ? (contents as any[]) : [];
  const canonicalEventId = (list[0] as { event?: { id?: string } } | undefined)
    ?.event?.id;
  if (canonicalEventId && canonicalEventId !== eventId) {
    const q = new URLSearchParams();
    if (initialChannelId) q.set("channel", initialChannelId);
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
