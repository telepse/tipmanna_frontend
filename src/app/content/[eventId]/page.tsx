/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { getEventByIdAction, getEventRoomAccessAction } from "@/actions/events";
import { ContentClient } from "@/components/events/content-client";
import { PrivateEventRoomBlocked } from "@/components/events/event-room-access-gate";
import { parseEventCharacterCatalog } from "@/lib/parse-event-character-catalog";
import { resolveProgramWatchAllPlaylist } from "@/actions/program-actions";
import { resolveHostPlaylistWatchAll } from "@/actions/host-playlist";
import { getToken } from "@/lib/getToken";
import { getHostToken } from "@/lib/getHostToken";
import {
  applyVideoDeepLinkQuery,
  buildContentShareUrl,
  parseChannelSearchParam,
  pickInitialChannelContent,
} from "@/lib/public-video-url";
import { notFound, redirect } from "next/navigation";
import { isEventRoomAccessDenied } from "@/lib/event-room-access";
import { Metadata } from "next";
import { buildVideoObjectJsonLd } from "@/lib/structured-data";
import {
  buildOgImageMetadata,
  resolveVideoOgImageUrl,
} from "@/lib/video-og-image";
import { getPrimaryOrigin } from "@/lib/site-config";
import { unwrapContentChannelList } from "@/lib/content-channel-payload";
import { getCachedContentChannelForPage } from "@/lib/cached-content-channel";

export interface Props {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface ContentData {
  id?: string;
  title?: string;
  url?: string;
  description?: string;
  createdAt?: string;
  restricted?: boolean;
  isDefault?: boolean;
  coOwnerNames?: string[];
  event: {
    hostName: string;
    id?: string;
  };
}

function pickContentForPage(
  list: ContentData[],
  initialChannelId: string | null
): ContentData | undefined {
  const playable = list.filter(c => !c.restricted);
  const playlist = playable.length ? playable : list;
  return pickInitialChannelContent(playlist, initialChannelId);
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
  const list = unwrapContentChannelList(res.data) as ContentData[];
  const videoRes = pickContentForPage(list, initialChannelId);

  const videoHasCoOwner =
    videoRes?.coOwnerNames?.length && videoRes?.coOwnerNames?.length > 0;

  const pageUrl = buildContentShareUrl({
    eventId,
    channelId: initialChannelId ?? undefined,
  });
  const hostLabel = videoHasCoOwner
    ? videoRes?.coOwnerNames?.join(", ")
    : videoRes?.event?.hostName;
  const title =
    videoRes?.title && hostLabel
      ? `Watch "${videoRes.title}" by ${hostLabel} 🎬 💎`
      : "Watch on Tipmanna 🎬 💎";
  const description = `Watch this video on Tipmanna and join the experience through comments, reactions, and realtime supporter engagement.`;
  const ogImage = resolveVideoOgImageUrl(videoRes?.url);
  const imageMeta = buildOgImageMetadata(ogImage);

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
      type: "video.other",
      ...imageMeta.openGraph,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...imageMeta.twitter,
    },
  };
}

export default async function ContentPage({ params, searchParams }: Props) {
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

  const programWatch =
    typeof sp.programWatch === "string" && sp.programWatch === "all";
  const playlistWatch =
    typeof sp.playlistWatch === "string" && sp.playlistWatch === "all";
  const playlistIdRaw = sp.playlistId;
  const playlistId =
    typeof playlistIdRaw === "string"
      ? playlistIdRaw.trim()
      : Array.isArray(playlistIdRaw)
        ? (playlistIdRaw[0]?.trim() ?? "")
        : "";
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
  const hostToken = await getHostToken();
  const authToken = token ?? hostToken ?? null;

  let initialProgramPlaylist: unknown[] | null = null;

  if (playlistWatch && playlistId) {
    const resolved = await resolveHostPlaylistWatchAll(playlistId, authToken);
    if (resolved) {
      initialProgramPlaylist = resolved.playlist;
      if (resolved.canonicalEventId !== eventId) {
        const q = new URLSearchParams({
          playlistWatch: "all",
          playlistId,
        });
        applyVideoDeepLinkQuery(q, initialChannelId);
        redirect(`/content/${resolved.canonicalEventId}?${q.toString()}`);
      }
    }
  } else if (programWatch) {
    if (!enforcement) notFound();
    const resolved = await resolveProgramWatchAllPlaylist(
      eventId,
      enforcement,
      community,
      authToken
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

  const rawPayload = contentsRes.data as {
    formattedContents?: ContentData[];
    isCommunity?: boolean;
    communityId?: string;
    communityName?: string;
  } | null;
  const contents = unwrapContentChannelList(rawPayload) as ContentData[];
  const isCommunity = Boolean(
    rawPayload &&
      typeof rawPayload === "object" &&
      "isCommunity" in rawPayload &&
      rawPayload.isCommunity
  );
  const communityId =
    rawPayload &&
    typeof rawPayload === "object" &&
    "communityId" in rawPayload &&
    typeof rawPayload.communityId === "string"
      ? rawPayload.communityId
      : "";
  const communityName =
    rawPayload &&
    typeof rawPayload === "object" &&
    "communityName" in rawPayload &&
    typeof rawPayload.communityName === "string"
      ? rawPayload.communityName
      : "";

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
    applyVideoDeepLinkQuery(q, initialChannelId);
    if (programWatch) {
      q.set("programWatch", "all");
      if (enforcement) q.set("enforcement", enforcement);
      if (community) q.set("community", community);
    }
    if (playlistWatch && playlistId) {
      q.set("playlistWatch", "all");
      q.set("playlistId", playlistId);
    }
    redirect(
      `/content/${canonicalEventId}${q.toString() ? `?${q.toString()}` : ""}`
    );
  }

  const playable = list.filter((c: any) => !c?.restricted);
  const hasWatchAllQueue =
    Array.isArray(initialProgramPlaylist) && initialProgramPlaylist.length > 0;
  if (list.length > 0 && playable.length === 0 && !hasWatchAllQueue) {
    const cid = (list[0] as { community?: { id: string } })?.community?.id;
    if (cid) {
      redirect(
        `/restricted/${cid}?next=${encodeURIComponent(`/content/${eventId}`)}`
      );
    }
  }

  const primary = pickContentForPage(list as ContentData[], initialChannelId);

  const videoJsonLd =
    primary?.title && primary.event?.hostName
      ? buildVideoObjectJsonLd({
          title: primary.title,
          hostName: primary.event.hostName,
          url: buildContentShareUrl({
            eventId,
            channelId: initialChannelId ?? undefined,
          }),
          videoUrl: primary.url,
          description: primary.description,
          uploadDate: primary.createdAt,
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
        <ContentClient
          contents={playable.length ? playable : list}
          characters={tippingCharacters as any[]}
          characterSets={characterSets as any[]}
          eventId={eventId}
          initialChannelId={initialChannelId}
          initialProgramPlaylist={
            Array.isArray(initialProgramPlaylist) &&
            initialProgramPlaylist.length
              ? (initialProgramPlaylist as any[])
              : null
          }
          playlistWatch={playlistWatch}
          playlistId={playlistId || null}
          isCommunity={isCommunity}
          communityId={communityId}
          communityName={communityName}
        />
      </div>
    </>
  );
}
