/**
 * Phase C0 — startup playback guard (pure helpers + in-memory state).
 *
 * Active only when `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1`. TVProvider owns
 * guard state refs; this module holds classification and decision logic.
 */

import { isSameOrchestratedPlayback } from "./tv-playback-request";

/** Startup-wide automatic player recoveries before first PLAYING. */
export const MAX_STARTUP_PLAYER_RECOVERIES = 3;

export type StartupPlaybackPhase =
  | "not_started"
  | "initial_command_issued"
  | "buffering_before_first_play"
  | "first_play_reached"
  | "stable"
  | "failed";

export type YoutubeErrorKind =
  | "permanent_content"
  | "transient_player"
  | "unknown";

/**
 * YouTube IFrame API error codes (https://developers.google.com/youtube/iframe_api_reference#Events).
 * 100 — video not found / private; 101/150 — embedding disallowed; 2/5 — player/param errors.
 */
export function classifyYoutubeErrorKind(code: number): YoutubeErrorKind {
  if (code === 100 || code === 101 || code === 150) return "permanent_content";
  if (code === 2 || code === 5) return "transient_player";
  return "unknown";
}

export type StartupPlayerErrorDecision =
  | { action: "skip_failed_target"; reason: "already_failed_target" }
  | { action: "cap_reached"; reason: "startup_recovery_cap_reached" }
  | { action: "advance_next"; reason: "permanent_content_error" }
  | {
      action: "retry_once";
      reason: "transient_player_error" | "unknown_error_code";
    }
  | { action: "legacy_per_video"; reason: "post_first_play" };

export type StartupPlayerErrorContext = {
  youtubeErrorCode: number;
  videoId: string | null;
  firstPlayReached: boolean;
  startupRecoveryCount: number;
  failedVideoIds: ReadonlySet<string>;
  transientRetriedVideoIds: ReadonlySet<string>;
};

export function classifyStartupPlayerError(
  ctx: StartupPlayerErrorContext
): StartupPlayerErrorDecision {
  if (ctx.firstPlayReached) {
    return { action: "legacy_per_video", reason: "post_first_play" };
  }

  const vid = ctx.videoId?.trim();
  if (vid && ctx.failedVideoIds.has(vid)) {
    return { action: "skip_failed_target", reason: "already_failed_target" };
  }

  if (ctx.startupRecoveryCount >= MAX_STARTUP_PLAYER_RECOVERIES) {
    return { action: "cap_reached", reason: "startup_recovery_cap_reached" };
  }

  const kind = classifyYoutubeErrorKind(ctx.youtubeErrorCode);
  if (kind === "permanent_content") {
    return { action: "advance_next", reason: "permanent_content_error" };
  }

  if (kind === "transient_player") {
    if (vid && ctx.transientRetriedVideoIds.has(vid)) {
      return { action: "advance_next", reason: "permanent_content_error" };
    }
    return { action: "retry_once", reason: "transient_player_error" };
  }

  if (vid && ctx.transientRetriedVideoIds.has(vid)) {
    return { action: "advance_next", reason: "permanent_content_error" };
  }
  return { action: "retry_once", reason: "unknown_error_code" };
}

export type StartupPlaybackGuardState = {
  phase: StartupPlaybackPhase;
  firstPlayReached: boolean;
  startupRecoveryCount: number;
  startupRecoveryCapReached: boolean;
  failedVideoIds: Set<string>;
  transientRetriedVideoIds: Set<string>;
  pendingLiveOffsetSeconds: number | null;
  pendingLiveScheduleIndex: number | null;
};

export function createStartupPlaybackGuardState(): StartupPlaybackGuardState {
  return {
    phase: "not_started",
    firstPlayReached: false,
    startupRecoveryCount: 0,
    startupRecoveryCapReached: false,
    failedVideoIds: new Set(),
    transientRetriedVideoIds: new Set(),
    pendingLiveOffsetSeconds: null,
    pendingLiveScheduleIndex: null,
  };
}

export function resetStartupPlaybackGuardState(
  state: StartupPlaybackGuardState
): void {
  state.phase = "not_started";
  state.firstPlayReached = false;
  state.startupRecoveryCount = 0;
  state.startupRecoveryCapReached = false;
  state.failedVideoIds.clear();
  state.transientRetriedVideoIds.clear();
  state.pendingLiveOffsetSeconds = null;
  state.pendingLiveScheduleIndex = null;
}

export function markStartupFirstPlay(
  state: StartupPlaybackGuardState
): boolean {
  if (state.firstPlayReached) return false;
  state.firstPlayReached = true;
  state.phase = "first_play_reached";
  return true;
}

export function markInitialCommandIssued(
  state: StartupPlaybackGuardState
): void {
  if (state.phase === "not_started") {
    state.phase = "initial_command_issued";
  }
}

export function shouldSuppressPrePlayDriftSeek(opts: {
  guardEnabled: boolean;
  firstPlayReached: boolean;
  isDriftCorrection: boolean;
}): boolean {
  if (!opts.guardEnabled) return false;
  if (opts.firstPlayReached) return false;
  return opts.isDriftCorrection;
}

export type DuplicateLoadCheck = {
  guardEnabled: boolean;
  firstPlayReached: boolean;
  req: { videoId: string; startSeconds: number; reason: string };
  orchestrated: { videoId: string; startSeconds: number } | null;
  playerState: string | null;
  inFlightVideoId: string | null;
};

/** Reasons that must never be coalesced away during startup. */
const DUPLICATE_LOAD_EXEMPT_REASONS = new Set([
  "startup_error_recovery",
  "startup_error_advance",
  "error_reload",
  "enforcement",
  "loadLocal",
]);

export function shouldSuppressDuplicatePrePlayLoad(
  opts: DuplicateLoadCheck
): boolean {
  if (!opts.guardEnabled || opts.firstPlayReached) return false;
  if (DUPLICATE_LOAD_EXEMPT_REASONS.has(opts.req.reason)) return false;

  const sameTarget = isSameOrchestratedPlayback(opts.orchestrated, opts.req);
  if (!sameTarget) return false;

  if (opts.inFlightVideoId === opts.req.videoId) return true;

  const loadingStates = new Set(["BUFFERING", "PLAYING", "PAUSED", "CUED"]);
  if (
    opts.orchestrated?.videoId === opts.req.videoId &&
    opts.playerState &&
    loadingStates.has(opts.playerState)
  ) {
    return true;
  }

  return false;
}

export type ScheduleItemLike = {
  segmentKind?: string;
  seekBaseSeconds?: number;
  channel?: { url?: string | null } | null;
};

export type BroadcastPositionLike = {
  scheduleIndex: number;
  offsetSeconds: number;
  item: ScheduleItemLike | null;
};

/** Skip failed regular-video targets while broadcast position still points at them. */
export function resolvePositionSkippingFailedTargets(
  pos: BroadcastPositionLike,
  items: ScheduleItemLike[],
  failedVideoIds: ReadonlySet<string>,
  extractVideoId: (url: string) => string | null,
  maxSteps?: number
): BroadcastPositionLike {
  if (!pos.item || failedVideoIds.size === 0) return pos;

  let current: BroadcastPositionLike = pos;
  const limit = maxSteps ?? items.length;
  for (let step = 0; step < limit; step += 1) {
    const url = current.item?.channel?.url;
    const vid = url ? extractVideoId(url) : null;
    if (
      !vid ||
      !failedVideoIds.has(vid) ||
      current.item?.segmentKind === "notice"
    ) {
      return current;
    }
    const nextIdx = findNextEligibleScheduleIndex(
      items,
      current.scheduleIndex,
      failedVideoIds,
      extractVideoId,
      1
    );
    if (nextIdx == null) return current;
    const nextItem = items[nextIdx]!;
    current = {
      ...current,
      scheduleIndex: nextIdx,
      offsetSeconds: nextItem.seekBaseSeconds ?? 0,
      item: nextItem,
    };
  }
  return current;
}

/** Next playable row after `fromIndex`, skipping failed video ids (bounded wrap). */
export function findNextEligibleScheduleIndex(
  items: ScheduleItemLike[],
  fromIndex: number,
  failedVideoIds: ReadonlySet<string>,
  extractVideoId: (url: string) => string | null,
  maxSteps?: number
): number | null {
  if (!items.length) return null;
  const limit = maxSteps ?? items.length;
  for (let step = 1; step <= limit; step += 1) {
    const idx = (fromIndex + step) % items.length;
    const item = items[idx];
    if (!item) continue;
    if (item.segmentKind === "notice") continue;
    const url = item.channel?.url;
    if (!url) continue;
    const vid = extractVideoId(url);
    if (!vid || failedVideoIds.has(vid)) continue;
    return idx;
  }
  return null;
}
