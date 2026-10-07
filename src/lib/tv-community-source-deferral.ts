import { normalizeTvCommunitySearchParam } from "@/lib/tv-ssr-live-tip-catalog";

export type TvCommunitySourceDeferralDecision =
  | { kind: "global"; activateGlobal: true }
  | { kind: "defer"; communityIntentId: string }
  | { kind: "video_fullscreen"; activateGlobal: true };

/**
 * Whether URL/localStorage community id must stay pending until the access gate allows.
 * Does not activate scheduleSourceCommunityId.
 */
export function resolveTvCommunitySourceDeferral(opts: {
  videoId: string | null | undefined;
  communityQuery: string | null | undefined;
  storedCommunityId: string | null | undefined;
  sideChickLocked: boolean;
}): TvCommunitySourceDeferralDecision {
  if (opts.videoId?.trim()) {
    return { kind: "video_fullscreen", activateGlobal: true };
  }
  if (opts.sideChickLocked) {
    const fromQuery = normalizeTvCommunitySearchParam(opts.communityQuery);
    if (fromQuery) return { kind: "defer", communityIntentId: fromQuery };
  }
  const fromQuery = normalizeTvCommunitySearchParam(opts.communityQuery);
  if (fromQuery) {
    return { kind: "defer", communityIntentId: fromQuery };
  }
  const stored = normalizeTvCommunitySearchParam(opts.storedCommunityId);
  if (stored) {
    return { kind: "defer", communityIntentId: stored };
  }
  return { kind: "global", activateGlobal: true };
}
