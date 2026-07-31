/**
 * Phase C1 — initial live-offset embed (pure helpers).
 *
 * Computes iframe start offsets, detects stale targets, and compares committed
 * embed state against sync requests. TVProvider owns mutable state; this module
 * holds testable decision logic only.
 */

import { isSameOrchestratedPlayback } from "./tv-playback-request";

/** Drift tolerance reused from provider sync (seconds). */
export const INITIAL_EMBED_SYNC_TOLERANCE_S = 3;

export type InitialTvPlaybackTarget = {
  startupGeneration: number;
  source: "global" | "community";
  sourceCommunityId: string | null;
  scheduleRevision: string | number | null;
  selectedIndex: number;
  videoId: string;
  startOffsetSeconds: number;
  resolvedAtPerformanceMs: number;
  segmentKind: "regular";
};

export type CommittedInitialEmbed = {
  videoId: string;
  startOffsetSeconds: number;
  selectedIndex: number;
  startupGeneration: number;
  committedAtPerformanceMs: number;
};

export type ScheduleItemForEmbed = {
  duration?: number;
  seekBaseSeconds?: number;
  segmentKind?: string;
  channel?: { url?: string | null } | null;
};

export type EmbedPositionInput = {
  t6Index: number;
  t6OffsetSeconds: number;
  t6ResolvedAtPerformanceMs: number;
  items: ScheduleItemForEmbed[];
  broadcastEpoch: number;
  totalDuration: number;
  nowMs: number;
  performanceNowMs: number;
  extractVideoId: (url: string) => string | null;
  resolvePosition: (
    items: ScheduleItemForEmbed[],
    broadcastEpoch: number,
    totalDuration: number,
    nowMs: number
  ) => { scheduleIndex: number; offsetSeconds: number };
};

export type EmbedPositionResult = {
  selectedIndex: number;
  videoId: string;
  startOffsetSeconds: number;
  rolledOver: boolean;
};

/** Integer seconds accepted by YouTube playerVars.start. */
export function normalizeEmbedStartSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.floor(seconds);
}

/** Clamp offset within seek-base and item duration (leave 1s headroom). */
export function clampOffsetToItem(
  offsetSeconds: number,
  item: ScheduleItemForEmbed | null | undefined
): number {
  const seekBase = item?.seekBaseSeconds ?? 0;
  const duration =
    typeof item?.duration === "number" && item.duration > 0
      ? item.duration
      : null;
  let clamped = Math.max(seekBase, normalizeEmbedStartSeconds(offsetSeconds));
  if (duration != null) {
    const maxSeek = seekBase + Math.max(0, duration - 1);
    clamped = Math.min(clamped, maxSeek);
  }
  return clamped;
}

/**
 * Compute iframe start offset at embed creation: re-resolve live position,
 * apply elapsed time since T6, clamp, handle index rollover.
 */
export function computeInitialEmbedPosition(
  input: EmbedPositionInput
): EmbedPositionResult | null {
  const fresh = input.resolvePosition(
    input.items,
    input.broadcastEpoch,
    input.totalDuration,
    input.nowMs
  );

  const selectedIndex = fresh.scheduleIndex;
  let offsetSeconds = fresh.offsetSeconds;
  const rolledOver = selectedIndex !== input.t6Index;

  if (!rolledOver) {
    const elapsedSec =
      (input.performanceNowMs - input.t6ResolvedAtPerformanceMs) / 1000;
    offsetSeconds = input.t6OffsetSeconds + Math.max(0, elapsedSec);
  }

  const item = input.items[selectedIndex];
  if (!item || item.segmentKind === "notice") return null;
  const url = item.channel?.url;
  if (!url) return null;
  const videoId = input.extractVideoId(url);
  if (!videoId) return null;

  offsetSeconds = clampOffsetToItem(offsetSeconds, item);

  return {
    selectedIndex,
    videoId,
    startOffsetSeconds: offsetSeconds,
    rolledOver,
  };
}

export function buildProvisionalInitialTarget(opts: {
  startupGeneration: number;
  source: "global" | "community";
  sourceCommunityId: string | null;
  scheduleRevision: string | number | null;
  selectedIndex: number;
  videoId: string;
  startOffsetSeconds: number;
  resolvedAtPerformanceMs: number;
}): InitialTvPlaybackTarget {
  return {
    startupGeneration: opts.startupGeneration,
    source: opts.source,
    sourceCommunityId: opts.sourceCommunityId,
    scheduleRevision: opts.scheduleRevision,
    selectedIndex: opts.selectedIndex,
    videoId: opts.videoId,
    startOffsetSeconds: opts.startOffsetSeconds,
    resolvedAtPerformanceMs: opts.resolvedAtPerformanceMs,
    segmentKind: "regular",
  };
}

export function isStaleStartupGeneration(
  callbackGeneration: number,
  activeGeneration: number
): boolean {
  return callbackGeneration !== activeGeneration;
}

/** Provisional target still matches committed embed at confirmation time. */
export function isInitialTargetStillValid(
  provisional: InitialTvPlaybackTarget | null,
  committed: CommittedInitialEmbed,
  activeGeneration: number
): boolean {
  if (!provisional) return false;
  if (isStaleStartupGeneration(committed.startupGeneration, activeGeneration)) {
    return false;
  }
  if (provisional.startupGeneration !== activeGeneration) return false;
  return (
    provisional.videoId === committed.videoId &&
    provisional.selectedIndex === committed.selectedIndex
  );
}

/**
 * Compare sync request against committed initial embed, accounting for clock
 * progression since the iframe was created.
 */
export function matchesCommittedInitialEmbed(
  committed: CommittedInitialEmbed | null,
  syncVideoId: string,
  syncOffsetSeconds: number,
  performanceNowMs: number,
  toleranceSeconds = INITIAL_EMBED_SYNC_TOLERANCE_S
): boolean {
  if (!committed) return false;
  if (committed.videoId !== syncVideoId) return false;
  const elapsedSec =
    (performanceNowMs - committed.committedAtPerformanceMs) / 1000;
  const expectedOffset = committed.startOffsetSeconds + Math.max(0, elapsedSec);
  return Math.abs(syncOffsetSeconds - expectedOffset) <= toleranceSeconds;
}

/** Whether requestPlayback should skip as redundant first reload (C1 clean path). */
export function shouldSkipInitialReload(
  committed: CommittedInitialEmbed | null,
  req: { videoId: string; startSeconds: number; reason: string },
  firstPlayReached: boolean,
  performanceNowMs: number,
  c1Enabled: boolean
): boolean {
  if (!c1Enabled || firstPlayReached || !committed) return false;
  if (
    req.reason !== "syncToLive" &&
    req.reason !== "syncToLive_coalesced_seek"
  ) {
    return false;
  }
  return matchesCommittedInitialEmbed(
    committed,
    req.videoId,
    req.startSeconds,
    performanceNowMs
  );
}

/** Static comparison for orchestrated ref seeding (±1s at commit time). */
export function isSameCommittedPlayback(
  committed: CommittedInitialEmbed | null,
  req: { videoId: string; startSeconds: number }
): boolean {
  if (!committed) return false;
  return isSameOrchestratedPlayback(
    {
      videoId: committed.videoId,
      startSeconds: committed.startOffsetSeconds,
    },
    req
  );
}
