import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import {
  normalizeExploreHandoffSnapshot,
  stashExploreChannelSnapshot,
  stashExplorePendingHandoff,
} from "@/lib/explore-video-navigation";

/** Warm feed boot + session snapshot before navigation or in-session handoff. */
export function warmExploreVideoHandoff(target: ExploreFeedOpenTarget): void {
  const videoId = target.videoId.trim();
  const eventId = target.eventId.trim();
  const channelSnapshot = target.channelSnapshot
    ? normalizeExploreHandoffSnapshot(target.channelSnapshot, videoId, eventId)
    : {};

  const normalized: ExploreFeedOpenTarget = {
    videoId,
    eventId,
    channelSnapshot,
  };

  stashExploreChannelSnapshot(videoId, channelSnapshot);
  stashExplorePendingHandoff(normalized);
  prefetchExploreFeedInitial();
}
