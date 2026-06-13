/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getContentChannelAction } from "@/actions/contents";
import { getEventByIdAction } from "@/actions/events";
import { ContentClient } from "@/components/events/content-client";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import { resolveProgramWatchAllPlaylist } from "@/actions/program-actions";
import { getToken } from "@/lib/getToken";
import { parseChannelSearchParam } from "@/lib/public-video-url";
import { notFound, redirect } from "next/navigation";

export interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContentPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const sp = await searchParams;
  const initialChannelId = parseChannelSearchParam(sp);

  const programWatch =
    typeof sp.programWatch === "string" && sp.programWatch === "all";
  const enforcementRaw = sp.enforcement;
  const enforcement =
    typeof enforcementRaw === "string"
      ? enforcementRaw.trim()
      : Array.isArray(enforcementRaw)
        ? (enforcementRaw[0]?.trim() ?? "")
        : "";
  const communityRaw = sp.community;
  const community =
    typeof communityRaw === "string" && communityRaw.trim() !== ""
      ? communityRaw.trim()
      : Array.isArray(communityRaw)
        ? (communityRaw[0]?.trim() ?? null)
        : null;

  const token = await getToken();

  let initialProgramPlaylist: unknown[] | null = null;

  if (programWatch) {
    if (!enforcement) notFound();
    const resolved = await resolveProgramWatchAllPlaylist(
      eventId,
      enforcement,
      community,
      token
    );
    if (!resolved) notFound();

    initialProgramPlaylist = resolved.playlist;

    if (resolved.canonicalEventId !== eventId) {
      const q = new URLSearchParams({
        programWatch: "all",
        enforcement,
      });
      if (community) q.set("community", community);
      redirect(`/content/${resolved.canonicalEventId}?${q.toString()}`);
    }
  }

  const [
    { data: contents },
    { data: characters },
    { data: globalCharacterSets },
    eventRes,
  ] = await Promise.all([
    getContentChannelAction(eventId, token ?? undefined),
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

  if (!eventId) return <div>Content not found</div>;

  const list = Array.isArray(contents) ? contents : [];
  const canonicalEventId = (list[0] as { event?: { id?: string } } | undefined)
    ?.event?.id;
  if (canonicalEventId && canonicalEventId !== eventId) {
    const q = new URLSearchParams();
    if (initialChannelId) q.set("channel", initialChannelId);
    if (programWatch) {
      q.set("programWatch", "all");
      if (enforcement) q.set("enforcement", enforcement);
      if (community) q.set("community", community);
    }
    redirect(
      `/content/${canonicalEventId}${q.toString() ? `?${q.toString()}` : ""}`
    );
  }

  const playable = list.filter((c: any) => !c?.restricted);
  if (list.length > 0 && playable.length === 0) {
    const cid = (list[0] as { community?: { id: string } })?.community?.id;
    if (cid) {
      redirect(
        `/restricted/${cid}?next=${encodeURIComponent(`/content/${eventId}`)}`
      );
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <ContentClient
        contents={playable.length ? playable : list}
        characters={tippingCharacters as any[]}
        characterSets={characterSets as any[]}
        eventId={eventId}
        initialChannelId={initialChannelId}
        initialProgramPlaylist={
          Array.isArray(initialProgramPlaylist) && initialProgramPlaylist.length
            ? (initialProgramPlaylist as any[])
            : null
        }
      />
    </div>
  );
}
