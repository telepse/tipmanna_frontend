import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import { stashExploreChannelSnapshot } from "@/lib/explore-video-navigation";

/** Warm feed boot + session snapshot before navigation or in-session handoff. */
export function warmExploreVideoHandoff(target: ExploreFeedOpenTarget): void {
  stashExploreChannelSnapshot(target.videoId, target.channelSnapshot ?? {});
  prefetchExploreFeedInitial();
}
