import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";

const SNAPSHOT_KEY_PREFIX = "tipmanna:explore-channel-snapshot:";

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

export function buildExploreVideoHref(target: ExploreFeedOpenTarget): string {
  const params = new URLSearchParams();
  params.set("tab", "feed");
  params.set("feedTab", "trends");
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
