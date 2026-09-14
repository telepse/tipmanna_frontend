/**
 * Phase C0 — startup playback guard (pure helpers + in-memory state).
 *
 * Active only when `NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD=1`. TVProvider owns
 * guard state refs; this module holds classification and decision logic.
 */

import { isSameOrchestratedPlayback } from "./tv-playback-request";

/** Startup-wide automatic player recoveries before stable playback (T13). */
export const MAX_STARTUP_PLAYER_RECOVERIES = 3;

export type StartupPlaybackPhase =
  | "not_started"
  | "initial_command_issued"
  | "buffering_before_first_play"
  | "first_play_reached"
  | "awaiting_stable_playback"
  | "stable"
  | "failed";

export type StartupErrorLifecyclePhase =
  | "before_first_play"
  | "after_first_play_before_stable"
  | "after_stable";

export type StartupPlaybackLifecycle = {
  firstPlayReached: boolean;
  stablePlaybackReached: boolean;
  terminalFailureReached: boolean;
};

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
  stablePlaybackReached: boolean;
  stabilityGuardEnabled: boolean;
  startupRecoveryCount: number;
  failedVideoIds: ReadonlySet<string>;
  transientRetriedVideoIds: ReadonlySet<string>;
};

/** Whether startup error containment (not legacy per-video) applies. */
export function shouldUseStartupErrorContainment(ctx: {
  stabilityGuardEnabled: boolean;
  stablePlaybackReached: boolean;
  firstPlayReached: boolean;
}): boolean {
  if (ctx.stabilityGuardEnabled) {
    return !ctx.stablePlaybackReached;
  }
  return !ctx.firstPlayReached;
}

export function getStartupErrorLifecyclePhase(ctx: {
  firstPlayReached: boolean;
  stablePlaybackReached: boolean;
}): StartupErrorLifecyclePhase {
  if (ctx.stablePlaybackReached) return "after_stable";
  if (ctx.firstPlayReached) return "after_first_play_before_stable";
  return "before_first_play";
}

export function isStartupStabilityContainmentActive(
  playbackGuardEnabled: boolean,
  stabilityGuardEnabled: boolean,
  state: Pick<
    StartupPlaybackGuardState,
    "stablePlaybackReached" | "terminalFailureReached"
  >
): boolean {
  return (
    playbackGuardEnabled &&
    stabilityGuardEnabled &&
    !state.stablePlaybackReached &&
    !state.terminalFailureReached
  );
}

export function shouldBlockStartupOrchestrationCommands(
  playbackGuardEnabled: boolean,
  stabilityGuardEnabled: boolean,
  state: Pick<StartupPlaybackGuardState, "terminalFailureReached">
): boolean {
  return (
    playbackGuardEnabled &&
    stabilityGuardEnabled &&
    state.terminalFailureReached
  );
}

export function classifyStartupPlayerError(
  ctx: StartupPlayerErrorContext
): StartupPlayerErrorDecision {
  if (
    !shouldUseStartupErrorContainment({
      stabilityGuardEnabled: ctx.stabilityGuardEnabled,
      stablePlaybackReached: ctx.stablePlaybackReached,
      firstPlayReached: ctx.firstPlayReached,
    })
  ) {
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
  stablePlaybackReached: boolean;
  terminalFailureReached: boolean;
  startupRecoveryCount: number;
  startupRecoveryCapReached: boolean;
  failedVideoIds: Set<string>;
  transientRetriedVideoIds: Set<string>;
  pendingLiveOffsetSeconds: number | null;
  pendingLiveScheduleIndex: number | null;
  /** Same-video corrective drift seek already issued pre-T13 for this video. */
  preStableCorrectiveSeekVideoId: string | null;
};

export function createStartupPlaybackGuardState(): StartupPlaybackGuardState {
  return {
    phase: "not_started",
    firstPlayReached: false,
    stablePlaybackReached: false,
    terminalFailureReached: false,
    startupRecoveryCount: 0,
    startupRecoveryCapReached: false,
    failedVideoIds: new Set(),
    transientRetriedVideoIds: new Set(),
    pendingLiveOffsetSeconds: null,
    pendingLiveScheduleIndex: null,
    preStableCorrectiveSeekVideoId: null,
  };
}

export function resetStartupPlaybackGuardState(
  state: StartupPlaybackGuardState
): void {
  state.phase = "not_started";
  state.firstPlayReached = false;
  state.stablePlaybackReached = false;
  state.terminalFailureReached = false;
  state.startupRecoveryCount = 0;
  state.startupRecoveryCapReached = false;
  state.failedVideoIds.clear();
  state.transientRetriedVideoIds.clear();
  state.pendingLiveOffsetSeconds = null;
  state.pendingLiveScheduleIndex = null;
  state.preStableCorrectiveSeekVideoId = null;
}

export function markStartupFirstPlay(
  state: StartupPlaybackGuardState
): boolean {
  if (state.firstPlayReached) return false;
  state.firstPlayReached = true;
  state.phase = "first_play_reached";
  return true;
}

export function markStartupAwaitingStablePlayback(
  state: StartupPlaybackGuardState
): void {
  if (state.phase === "first_play_reached") {
    state.phase = "awaiting_stable_playback";
  }
}

export function markStartupStablePlayback(
  state: StartupPlaybackGuardState
): boolean {
  if (state.stablePlaybackReached) return false;
  state.stablePlaybackReached = true;
  state.phase = "stable";
  return true;
}

export function markStartupTerminalFailure(
  state: StartupPlaybackGuardState
): boolean {
  if (state.terminalFailureReached) return false;
  state.terminalFailureReached = true;
  state.startupRecoveryCapReached = true;
  state.phase = "failed";
  return true;
}

export function markPreStableCorrectiveSeekIssued(
  state: StartupPlaybackGuardState,
  videoId: string
): void {
  state.preStableCorrectiveSeekVideoId = videoId;
}

export function resetPreStableCorrectiveSeekAllowance(
  state: StartupPlaybackGuardState,
  videoId: string | null
): void {
  if (!videoId || state.preStableCorrectiveSeekVideoId !== videoId) {
    state.preStableCorrectiveSeekVideoId = null;
  }
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

const PRE_STABLE_NON_PLAYING_SEEK_STATES = new Set([
  "BUFFERING",
  "UNSTARTED",
  "CUED",
  "ENDED",
  "PAUSED",
]);

export type PreStableDriftSeekDecision =
  | { suppress: false; issueCorrective: true }
  | {
      suppress: true;
      reason: "non_playing_state" | "corrective_already_issued";
    };

/** Phase C0.1 — drift seek policy between first PLAYING and T13 stable. */
export function evaluatePreStableDriftSeek(opts: {
  stabilityContainmentActive: boolean;
  firstPlayReached: boolean;
  playerState: string | null;
  videoId: string;
  preStableCorrectiveSeekVideoId: string | null;
  isDriftCorrection: boolean;
}): PreStableDriftSeekDecision | { suppress: false; issueCorrective: false } {
  if (!opts.stabilityContainmentActive || !opts.firstPlayReached) {
    return { suppress: false, issueCorrective: false };
  }
  if (!opts.isDriftCorrection) {
    return { suppress: false, issueCorrective: false };
  }

  const state = opts.playerState;
  if (!state || PRE_STABLE_NON_PLAYING_SEEK_STATES.has(state)) {
    return { suppress: true, reason: "non_playing_state" };
  }

  if (state === "PLAYING") {
    if (opts.preStableCorrectiveSeekVideoId === opts.videoId) {
      return { suppress: true, reason: "corrective_already_issued" };
    }
    return { suppress: false, issueCorrective: true };
  }

  return { suppress: true, reason: "non_playing_state" };
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
  "tab_snapshot_restore",
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
