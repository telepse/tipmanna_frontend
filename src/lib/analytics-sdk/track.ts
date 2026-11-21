import { isAnalyticsSdkEnabled } from "./flags";
import { mintEventUid } from "./event-uid";
import { enqueueSdkEvents } from "./queue";
import type { SdkBatchContext, SdkPlaybackEventV2 } from "./types";
import type { TvAnalyticsEventV1 } from "../tvAnalyticsSchema";

export function withEventUid(
  ev: TvAnalyticsEventV1,
  activationId?: string
): SdkPlaybackEventV2 {
  return {
    ...ev,
    eventUid: mintEventUid(),
    ...(activationId ? { activationId } : {}),
  };
}

/** Public emit API — not wired to product pages in P1-3. */
export function trackSdkEvents(
  events: SdkPlaybackEventV2[],
  _ctx?: SdkBatchContext
): void {
  if (!isAnalyticsSdkEnabled()) return;
  if (events.length === 0) return;
  enqueueSdkEvents(events);
}
