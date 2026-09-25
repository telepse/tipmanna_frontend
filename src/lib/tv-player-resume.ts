/** Max wait for YouTube onReady after SPA remount before forcing embed remount. */
export const TV_EMBED_ONREADY_TIMEOUT_MS = 4000;

/** Max watchdog remounts per TVProvider mount (prevents infinite loops). */
export const TV_EMBED_ONREADY_MAX_REMOUNTS = 1;

/** Poll interval for in-place embed health recovery (stay-on-page freeze). */
export const TV_EMBED_HEALTH_POLL_MS = 1500;

/** Sustained dead iframe before heartbeat triggers recovery. */
export const TV_EMBED_DEAD_IFRAME_MS = 8000;

/** Minimum gap between automatic embed recoveries. */
export const TV_EMBED_RECOVERY_COOLDOWN_MS = 15_000;

/** Drop a stuck recovery latch only after a real construct stall. */
export const TV_EMBED_RECOVERY_LATCH_MS = 12_000;

/** Brief tab hide (Chrome iframe discard) must not remount — flush + sync only. */
export const TV_HIDE_REMOUNT_MS = 30_000;

/** Heartbeat must not remount while playback was usable within this window. */
export const TV_HEARTBEAT_USABLE_VETO_MS = 20_000;

const RECENT_PLAYBACK_STATES = new Set([
  "PLAYING",
  "PAUSED",
  "BUFFERING",
  "CUED",
]);

let tabEmbedGeneration = 0;

/** Tab-scoped monotonic id so each TVProvider mount gets a unique react-youtube key. */
export function allocateTvEmbedGeneration(): number {
  tabEmbedGeneration += 1;
  return tabEmbedGeneration;
}

/** Test-only reset. */
export function resetTvEmbedGenerationForTests(): void {
  tabEmbedGeneration = 0;
}

export type TvPlayerResumeProbe = {
  documentWasHidden: boolean;
  visibilityState: DocumentVisibilityState;
  startupInFlight: boolean;
  firstPlayReached: boolean;
  iframeLive: boolean;
  commandReady: boolean;
  playerState: string | null;
  remountedThisHideShowCycle: boolean;
  /** Elapsed ms document was hidden before this visible tick. */
  hiddenDurationMs: number;
};

export type TvEmbedOnReadyWatchdogInput = {
  youtubeChildReleased: boolean;
  hasVideoId: boolean;
  onReadyFired: boolean;
  elapsedMs: number;
  remountCount: number;
  timeoutMs?: number;
  maxRemounts?: number;
};

const USABLE_RESUME_STATES = new Set([
  "PLAYING",
  "PAUSED",
  "BUFFERING",
  "CUED",
  "ENDED",
]);

export function isTvPlayerStateUsable(
  state: string | null | undefined
): boolean {
  return !!state && USABLE_RESUME_STATES.has(state);
}

/** Recent PLAYING/PAUSED/BUFFERING/CUED — used for heartbeat remount veto. */
export function isTvPlayerStateRecentPlayback(
  state: string | null | undefined
): boolean {
  return !!state && RECENT_PLAYBACK_STATES.has(state);
}

/**
 * Remount only after a real hide→show (or bfcache pageshow) when the embed is
 * actually gone. A usable playerState with the iframe still in the document, or
 * a one-tick commandReady hole, is not a remount. Same both-dead rule as heartbeat.
 */
export function shouldRemountTvPlayer(opts: TvPlayerResumeProbe): boolean {
  if (opts.visibilityState !== "visible") return false;
  if (!opts.documentWasHidden) return false;
  if (opts.startupInFlight) return false;
  if (!opts.firstPlayReached) return false;
  if (opts.remountedThisHideShowCycle) return false;
  if (opts.hiddenDurationMs < TV_HIDE_REMOUNT_MS) return false;
  if (isTvPlayerStateUsable(opts.playerState) && opts.iframeLive) return false;
  if (opts.commandReady) return false;
  return !opts.iframeLive && !opts.commandReady;
}

export type TvEmbedHealthProbe = {
  playerVisible: boolean;
  startupInFlight: boolean;
  firstPlayReached: boolean;
  scheduleReady: boolean;
  commandReady: boolean;
  iframeLive: boolean;
  playerState?: string | null;
  /** Looper mounted and first play reached but provider ref is null (orphaned). */
  orphanedRef: boolean;
  embedRecoveryInFlight: boolean;
  msSinceLastRecovery: number;
  deadIframeSinceMs: number | null;
  /** Ms since last PLAYING/PAUSED/BUFFERING/CUED; omit or Infinity when never. */
  msSinceLastUsableState?: number;
  nowMs?: number;
};

/**
 * In-place embed recovery while the user stays on /tv (no full page reload).
 * Remounts via startupEmbedGeneration when the iframe has been dead long enough
 * and the command API is gone (including a true orphan after cooldown).
 * Do not remount a usable playing/paused row, a generation still in-flight,
 * or a one-tick orphan after hide→show remount.
 */
export function shouldRecoverTvPlayerEmbed(opts: TvEmbedHealthProbe): boolean {
  if (!opts.playerVisible) return false;
  if (opts.startupInFlight) return false;
  if (!opts.firstPlayReached) return false;
  if (!opts.scheduleReady) return false;
  if (opts.embedRecoveryInFlight) return false;
  if (opts.msSinceLastRecovery < TV_EMBED_RECOVERY_COOLDOWN_MS) return false;

  if (
    opts.msSinceLastUsableState != null &&
    opts.msSinceLastUsableState < TV_HEARTBEAT_USABLE_VETO_MS
  ) {
    return false;
  }

  const now = opts.nowMs ?? Date.now();
  const deadLongEnough =
    opts.deadIframeSinceMs != null &&
    now - opts.deadIframeSinceMs >= TV_EMBED_DEAD_IFRAME_MS;

  if (
    isTvPlayerStateUsable(opts.playerState) &&
    (opts.iframeLive || !deadLongEnough)
  ) {
    return false;
  }

  if (opts.commandReady) return false;

  if (opts.orphanedRef && !opts.iframeLive) return true;

  if (!opts.iframeLive && deadLongEnough) return true;

  return false;
}

/** Clear stuck recovery latch when remount did not become command-ready in time. */
export function shouldClearEmbedRecoveryInFlight(opts: {
  embedRecoveryInFlight: boolean;
  commandReady: boolean;
  elapsedMs: number;
  timeoutMs?: number;
}): boolean {
  if (!opts.embedRecoveryInFlight) return false;
  if (opts.commandReady) return false;
  const timeoutMs = opts.timeoutMs ?? TV_EMBED_RECOVERY_LATCH_MS;
  return opts.elapsedMs >= timeoutMs;
}

/**
 * SPA remount recovery: only when the iframe is dead and playback API is gone.
 * Does not remount merely because onReady is late (command-ready uses playback API).
 */
export function shouldForceEmbedRemount(
  opts: TvEmbedOnReadyWatchdogInput & {
    iframeLive?: boolean;
    commandReady?: boolean;
  }
): boolean {
  const timeoutMs = opts.timeoutMs ?? TV_EMBED_ONREADY_TIMEOUT_MS;
  const maxRemounts = opts.maxRemounts ?? TV_EMBED_ONREADY_MAX_REMOUNTS;
  if (!opts.youtubeChildReleased) return false;
  if (!opts.hasVideoId) return false;
  if (opts.remountCount >= maxRemounts) return false;
  if (opts.elapsedMs < timeoutMs) return false;
  if (opts.commandReady) return false;
  if (opts.iframeLive) return false;
  return true;
}

/** Ignore YouTube callbacks from a prior construct epoch after teardown. */
export function shouldAcceptTvPlayerYtCallback(
  callbackEpoch: number,
  currentEpoch: number
): boolean {
  return callbackEpoch === currentEpoch;
}

/**
 * Keep the existing YT.Player across construct-effect re-runs (React Strict Mode)
 * when the construct key is unchanged. Destroy only on unmount or key change.
 */
export function shouldReuseExistingTvYtPlayer(opts: {
  hasPlayer: boolean;
  constructKey: string;
  constructedKey: string | null;
}): boolean {
  return opts.hasPlayer && opts.constructedKey === opts.constructKey;
}

/** Visibility remount or target change: tear down before constructing a new player. */
export function shouldReplaceTvYtPlayer(opts: {
  hasPlayer: boolean;
  constructKey: string;
  constructedKey: string | null;
}): boolean {
  return opts.hasPlayer && opts.constructedKey !== opts.constructKey;
}
