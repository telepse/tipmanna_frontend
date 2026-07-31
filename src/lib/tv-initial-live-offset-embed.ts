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
  source: "global" | "community";
  sourceCommunityId: string | null;
};

export type InitialEmbedSuccessTrigger =
  | "first_sync_request_playback"
  | "first_sync_same_index"
  | "first_playing_fallback";

export type InitialEmbedSuccessRejectionReason =
  | "no_committed_target"
  | "stale_generation"
  | "source_mismatch"
  | "community_mismatch"
  | "video_mismatch"
  | "index_mismatch"
  | "offset_mismatch"
  | "replacement_load_issued"
  | "pre_play_seek_executed"
  | "initial_target_stale"
  | "c1_disabled";

export type InitialEmbedSuccessEvaluationInput = {
  committedTarget: CommittedInitialEmbed | null;
  activeStartupGeneration: number;
  currentSource: "global" | "community";
  currentCommunityId: string | null;
  currentVideoId: string | null;
  currentScheduleIndex: number | null;
  currentLiveOffsetSeconds: number | null;
  nowPerformanceMs: number;
  replacementLoadIssued: boolean;
  prePlaySeekExecuted: boolean;
  initialTargetMarkedStale: boolean;
  c1Enabled: boolean;
  toleranceSeconds?: number;
};

export type InitialEmbedSuccessEvaluation =
  | {
      success: true;
      expectedOffsetSeconds: number;
      driftSeconds: number;
    }
  | {
      success: false;
      reason: InitialEmbedSuccessRejectionReason;
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

/** Elapsed-aware expected offset from a committed initial embed. */
export function computeExpectedCommittedOffsetSeconds(
  committed: CommittedInitialEmbed,
  nowPerformanceMs: number
): number {
  const elapsedSec = Math.max(
    0,
    (nowPerformanceMs - committed.committedAtPerformanceMs) / 1000
  );
  return committed.startOffsetSeconds + elapsedSec;
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
  const expectedOffset = computeExpectedCommittedOffsetSeconds(
    committed,
    performanceNowMs
  );
  return Math.abs(syncOffsetSeconds - expectedOffset) <= toleranceSeconds;
}

/** Whether success may be recorded once for the active startup generation. */
export function canRecordInitialEmbedSuccess(
  alreadyRecordedForGeneration: number | null,
  activeStartupGeneration: number,
  committedStartupGeneration: number
): boolean {
  if (!canRecordInitialEmbedSuccessGeneration(alreadyRecordedForGeneration, activeStartupGeneration)) {
    return false;
  }
  return !isStaleStartupGeneration(
    committedStartupGeneration,
    activeStartupGeneration
  );
}

export function canRecordInitialEmbedSuccessGeneration(
  alreadyRecordedForGeneration: number | null,
  activeStartupGeneration: number
): boolean {
  return alreadyRecordedForGeneration !== activeStartupGeneration;
}

/** Whether sync-based confirmation should set matched-first-sync. */
export function isSyncBasedInitialEmbedSuccessTrigger(
  trigger: InitialEmbedSuccessTrigger
): boolean {
  return (
    trigger === "first_sync_request_playback" ||
    trigger === "first_sync_same_index"
  );
}

/**
 * Pure evaluation for C1.1 success confirmation (no React, no trace counters).
 */
export function evaluateInitialEmbedSuccess(
  input: InitialEmbedSuccessEvaluationInput
): InitialEmbedSuccessEvaluation {
  if (!input.c1Enabled) {
    return { success: false, reason: "c1_disabled" };
  }
  const committed = input.committedTarget;
  if (!committed) {
    return { success: false, reason: "no_committed_target" };
  }
  if (
    isStaleStartupGeneration(
      committed.startupGeneration,
      input.activeStartupGeneration
    )
  ) {
    return { success: false, reason: "stale_generation" };
  }
  if (input.initialTargetMarkedStale) {
    return { success: false, reason: "initial_target_stale" };
  }
  if (input.replacementLoadIssued) {
    return { success: false, reason: "replacement_load_issued" };
  }
  if (input.prePlaySeekExecuted) {
    return { success: false, reason: "pre_play_seek_executed" };
  }
  if (committed.source !== input.currentSource) {
    return { success: false, reason: "source_mismatch" };
  }
  const committedCommunity = committed.sourceCommunityId ?? null;
  const currentCommunity = input.currentCommunityId ?? null;
  if (committedCommunity !== currentCommunity) {
    return { success: false, reason: "community_mismatch" };
  }
  if (
    input.currentVideoId == null ||
    committed.videoId !== input.currentVideoId
  ) {
    return { success: false, reason: "video_mismatch" };
  }
  if (
    input.currentScheduleIndex == null ||
    committed.selectedIndex !== input.currentScheduleIndex
  ) {
    return { success: false, reason: "index_mismatch" };
  }
  if (
    input.currentLiveOffsetSeconds == null ||
    !Number.isFinite(input.currentLiveOffsetSeconds)
  ) {
    return { success: false, reason: "offset_mismatch" };
  }

  const expectedOffsetSeconds = computeExpectedCommittedOffsetSeconds(
    committed,
    input.nowPerformanceMs
  );
  const driftSeconds = Math.abs(
    input.currentLiveOffsetSeconds - expectedOffsetSeconds
  );
  const tolerance = input.toleranceSeconds ?? INITIAL_EMBED_SYNC_TOLERANCE_S;
  if (driftSeconds > tolerance) {
    return { success: false, reason: "offset_mismatch" };
  }

  return {
    success: true,
    expectedOffsetSeconds,
    driftSeconds,
  };
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
