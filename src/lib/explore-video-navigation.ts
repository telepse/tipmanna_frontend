import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

const SNAPSHOT_KEY_PREFIX = "tipmanna:explore-channel-snapshot:";
const PENDING_HANDOFF_KEY = "tipmanna:explore-pending-handoff:v1";

/** Cross-tab handoffs (e.g. TipLink `window.open`) require localStorage; same-tab may still read sessionStorage. */
function readExploreHandoffStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeExploreHandoffStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function removeExploreHandoffStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** URL param marking a TipLink → Explore reel handoff (must stay in reel). */
export const EXPLORE_HANDOFF_FROM_TIPLINK = "tiplink";

export function parseStayInExploreReelFromUrl(
  searchParams: URLSearchParams
): boolean {
  return searchParams.get("from")?.trim() === EXPLORE_HANDOFF_FROM_TIPLINK;
}

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
  writeExploreHandoffStorage(
    `${SNAPSHOT_KEY_PREFIX}${videoId.trim()}`,
    JSON.stringify(snapshot)
  );
}

export function readExploreChannelSnapshot(
  videoId: string
): Record<string, unknown> | undefined {
  if (typeof window === "undefined" || !videoId.trim()) return undefined;
  try {
    const raw = readExploreHandoffStorage(
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

  writeExploreHandoffStorage(
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
      ...(target.stayInExploreReel ? { stayInExploreReel: true } : {}),
    } satisfies ExploreFeedOpenTarget)
  );
  stashExploreChannelSnapshot(videoId, channelSnapshot);
}

export function readExplorePendingHandoff(): ExploreFeedOpenTarget | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readExploreHandoffStorage(PENDING_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExploreFeedOpenTarget;
    if (!parsed?.videoId?.trim() || !parsed?.eventId?.trim()) return null;
    return {
      videoId: parsed.videoId.trim(),
      eventId: parsed.eventId.trim(),
      channelSnapshot: parsed.channelSnapshot ?? {},
      discoverReturnTo: parsed.discoverReturnTo,
      discoverReturnLabel: parsed.discoverReturnLabel,
      stayInExploreReel: parsed.stayInExploreReel === true,
    };
  } catch {
    return null;
  }
}

export function clearExplorePendingHandoff(): void {
  removeExploreHandoffStorage(PENDING_HANDOFF_KEY);
}

/** Whether Explore should skip channel-client bounce for this handoff target. */
export function exploreHandoffStaysInReel(
  target: ExploreFeedOpenTarget
): boolean {
  return target.stayInExploreReel === true;
}

/** Merge URL + pending handoffs (cross-tab TipLink may split params vs snapshot). */
export function mergeExploreHandoffTargets(
  urlTarget: ExploreFeedOpenTarget | null,
  pending: ExploreFeedOpenTarget | null
): ExploreFeedOpenTarget | null {
  if (!urlTarget && !pending) return null;
  if (!urlTarget) return pending;
  if (!pending) return urlTarget;
  if (handoffKeyForTarget(urlTarget) !== handoffKeyForTarget(pending)) {
    return urlTarget;
  }
  const urlSnapshot = urlTarget.channelSnapshot;
  const pendingSnapshot = pending.channelSnapshot;
  const channelSnapshot =
    urlSnapshot && Object.keys(urlSnapshot).length > 0
      ? urlSnapshot
      : (pendingSnapshot ?? {});
  return {
    ...pending,
    ...urlTarget,
    channelSnapshot,
    stayInExploreReel:
      urlTarget.stayInExploreReel === true ||
      pending.stayInExploreReel === true,
  };
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
  if (target.stayInExploreReel) {
    params.set("from", EXPLORE_HANDOFF_FROM_TIPLINK);
  } else {
    params.delete("from");
  }
  return `/explore?${params.toString()}`;
}

/** TipLink store → Explore reel handoff with a playable snapshot. */
export function buildTipLinkExploreHandoff(args: {
  channelId: string;
  eventId: string;
  url: string;
  title: string;
  hostUsername: string;
  numOfTips?: number;
  amountRaised?: number;
  amountToRaise?: number;
}): ExploreFeedOpenTarget {
  const channelSnapshot = normalizeExploreHandoffSnapshot(
    {
      id: args.channelId,
      url: args.url,
      title: args.title,
      liveStatus: "NOT_LIVE",
      isLive: false,
      numOfTips: args.numOfTips ?? 0,
      event: {
        id: args.eventId,
        username: args.hostUsername,
        amountRaised: args.amountRaised,
        amountToRaise: args.amountToRaise,
      },
    },
    args.channelId,
    args.eventId
  );

  return {
    videoId: args.channelId,
    eventId: args.eventId,
    channelSnapshot,
    stayInExploreReel: true,
  };
}

export function exploreOpenTargetFromUrl(
  searchParams: URLSearchParams
): ExploreFeedOpenTarget | null {
  const videoId = searchParams.get("channel")?.trim();
  const eventId = searchParams.get("eventId")?.trim();
  if (!videoId || !eventId) return null;
  const channelSnapshot = readExploreChannelSnapshot(videoId);
  const stayInExploreReel = parseStayInExploreReelFromUrl(searchParams);
  return {
    videoId,
    eventId,
    ...(channelSnapshot ? { channelSnapshot } : {}),
    ...(stayInExploreReel ? { stayInExploreReel: true } : {}),
  };
}
