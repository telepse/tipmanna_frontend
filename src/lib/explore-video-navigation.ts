import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

const SNAPSHOT_KEY_PREFIX = "tipmanna:explore-channel-snapshot:";
const PENDING_HANDOFF_KEY = "tipmanna:explore-pending-handoff:v1";

export function normalizeExploreHandoffSnapshot(
  content: Record<string, unknown>,
  videoId: string,
  eventId: string
): Record<string, unknown> {
  const snapshot = { ...content };
  snapshot.id = videoId;

  const event =
    snapshot.event && typeof snapshot.event === "object"
      ? { ...(snapshot.event as Record<string, unknown>) }
      : {};
  event.id = eventId;
  snapshot.event = event;

  if (typeof snapshot.url !== "string") {
    snapshot.url = "";
  }
  if (typeof snapshot.liveStatus !== "string") {
    snapshot.liveStatus = "NOT_LIVE";
  }

  return snapshot;
}

export function buildExploreHandoffTarget(content: {
  id?: string;
  event?: { id?: string } | null;
  [key: string]: unknown;
}): ExploreFeedOpenTarget | null {
  const videoId = content.id?.trim();
  const eventId = content.event?.id?.trim();
  if (!videoId || !eventId) return null;

  return {
    videoId,
    eventId,
    channelSnapshot: normalizeExploreHandoffSnapshot(
      content as Record<string, unknown>,
      videoId,
      eventId
    ),
  };
}

export function stashExploreChannelSnapshot(
  videoId: string,
  snapshot: Record<string, unknown>
): void {
  if (typeof window === "undefined" || !videoId.trim()) return;
  try {
    sessionStorage.setItem(
      `${SNAPSHOT_KEY_PREFIX}${videoId.trim()}`,
      JSON.stringify(snapshot)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readExploreChannelSnapshot(
  videoId: string
): Record<string, unknown> | undefined {
  if (typeof window === "undefined" || !videoId.trim()) return undefined;
  try {
    const raw = sessionStorage.getItem(
      `${SNAPSHOT_KEY_PREFIX}${videoId.trim()}`
    );
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Full handoff payload for cross-page navigation (Discover page, creator profile, etc.). */
export function stashExplorePendingHandoff(
  target: ExploreFeedOpenTarget
): void {
  if (typeof window === "undefined") return;
  const videoId = target.videoId.trim();
  const eventId = target.eventId.trim();
  if (!videoId || !eventId) return;

  const channelSnapshot = target.channelSnapshot
    ? normalizeExploreHandoffSnapshot(target.channelSnapshot, videoId, eventId)
    : {};

  try {
    sessionStorage.setItem(
      PENDING_HANDOFF_KEY,
      JSON.stringify({
        videoId,
        eventId,
        channelSnapshot,
        ...(target.discoverReturnTo
          ? { discoverReturnTo: target.discoverReturnTo }
          : {}),
        ...(target.discoverReturnLabel
          ? { discoverReturnLabel: target.discoverReturnLabel }
          : {}),
      } satisfies ExploreFeedOpenTarget)
    );
    stashExploreChannelSnapshot(videoId, channelSnapshot);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readExplorePendingHandoff(): ExploreFeedOpenTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExploreFeedOpenTarget;
    if (!parsed?.videoId?.trim() || !parsed?.eventId?.trim()) return null;
    return {
      videoId: parsed.videoId.trim(),
      eventId: parsed.eventId.trim(),
      channelSnapshot: parsed.channelSnapshot ?? {},
      discoverReturnTo: parsed.discoverReturnTo,
      discoverReturnLabel: parsed.discoverReturnLabel,
    };
  } catch {
    return null;
  }
}

export function clearExplorePendingHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_HANDOFF_KEY);
  } catch {
    /* ignore */
  }
}

/** Stable key for deduping URL-driven reel handoffs (`channel` + `eventId`). */
export function exploreVideoHandoffKeyFromUrl(
  searchParams: URLSearchParams
): string | null {
  const videoId = searchParams.get("channel")?.trim();
  const eventId = searchParams.get("eventId")?.trim();
  if (!videoId || !eventId) return null;
  return `${videoId}:${eventId}`;
}

export function handoffKeyForTarget(target: ExploreFeedOpenTarget): string {
  return `${target.videoId.trim()}:${target.eventId.trim()}`;
}

export function buildExploreVideoHref(target: ExploreFeedOpenTarget): string {
  return buildExploreVideoHandoffHref(target, "");
}

/** Preserve live Explore query keys (e.g. e2e=1) while adding reel handoff params. */
export function buildExploreVideoHandoffHref(
  target: ExploreFeedOpenTarget,
  existingSearchParams: URLSearchParams | string
): string {
  const params = new URLSearchParams(
    typeof existingSearchParams === "string"
      ? existingSearchParams
      : existingSearchParams.toString()
  );
  params.delete("tab");
  params.delete("joinCommunity");
  params.set("feedTab", "trends");
  params.delete("tvSource");
  params.set("channel", target.videoId.trim());
  params.set("eventId", target.eventId.trim());
  return `/explore?${params.toString()}`;
}

export function exploreOpenTargetFromUrl(
  searchParams: URLSearchParams
): ExploreFeedOpenTarget | null {
  const videoId = searchParams.get("channel")?.trim();
  const eventId = searchParams.get("eventId")?.trim();
  if (!videoId || !eventId) return null;
  const channelSnapshot = readExploreChannelSnapshot(videoId);
  return {
    videoId,
    eventId,
    ...(channelSnapshot ? { channelSnapshot } : {}),
  };
}
