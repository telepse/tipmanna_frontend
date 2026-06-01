/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getContentChannelAction } from "@/actions/contents";
import { ChannelClient } from "@/components/events/channel-client";
import { parseChannelSearchParam } from "@/lib/public-video-url";
import { redirect } from "next/navigation";

export interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ChannelPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const sp = await searchParams;
  const initialChannelId = parseChannelSearchParam(sp);

  const [{ data: contents }, { data: characters }, { data: characterSets }] =
    await Promise.all([
      getContentChannelAction(eventId),
      getCharactersForTipping(),
      getAllCharacterSets(),
    ]);

  console.log("[CHANNEL PAGE] characterSets", characterSets);

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
        characters={characters as any[]}
        characterSets={characterSets as any[]}
        eventId={eventId}
        initialChannelId={initialChannelId}
      />
    </div>
  );
}
