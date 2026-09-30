/** Max wait for YouTube onReady after SPA remount before forcing embed remount. */
export const TV_EMBED_ONREADY_TIMEOUT_MS = 4000;

/** Max watchdog remounts per TVProvider mount (prevents infinite loops). */
export const TV_EMBED_ONREADY_MAX_REMOUNTS = 1;

/** Poll interval for in-place embed health recovery (stay-on-page freeze). */
export const TV_EMBED_HEALTH_POLL_MS = 1500;

/** Sustained dead iframe before heartbeat triggers recovery. */
export const TV_EMBED_DEAD_IFRAME_MS = 8000;

/** Sustained command-dead (iframe may still be live) before heartbeat remount. */
export const TV_COMMAND_DEAD_MS = 3000;

/** Minimum gap between automatic embed recoveries. */
export const TV_EMBED_RECOVERY_COOLDOWN_MS = 8000;

/** Drop a stuck recovery latch only after a real construct stall. */
export const TV_EMBED_RECOVERY_LATCH_MS = 8000;

/**
 * Brief hide grace for both-dead flicker only. Command-dead remount does not
 * require this duration (anti-trap).
 */
export const TV_HIDE_REMOUNT_MS = 30_000;

/** Heartbeat must not remount a command-ready player that was recently usable. */
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
 * Remount after hide→show when the playback command API is gone.
 * Restores 52e5d7e anti-trap: `!commandReady` remounts even if the iframe node
 * is still in the document. Healthy `commandReady` never remounts.
 * Brief-hide grace applies only when both iframe and command API are gone
 * (Chrome flicker); command-dead does not wait for TV_HIDE_REMOUNT_MS.
 */
export function shouldRemountTvPlayer(opts: TvPlayerResumeProbe): boolean {
  if (opts.visibilityState !== "visible") return false;
  if (!opts.documentWasHidden) return false;
  if (opts.startupInFlight) return false;
  if (!opts.firstPlayReached) return false;
  if (opts.remountedThisHideShowCycle) return false;
  if (opts.commandReady) return false;

  // Command-dead with iframe still present: remount immediately (anti-trap).
  if (opts.iframeLive) return true;

  // Both-dead: require sustained hide to avoid brief Chrome iframe discard thrash.
  if (opts.hiddenDurationMs < TV_HIDE_REMOUNT_MS) return false;
  return true;
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
  /** Ms since command API was last observed ready; omit when unknown. */
  msSinceCommandDead?: number;
  /** Ms since last PLAYING/PAUSED/BUFFERING/CUED; omit or Infinity when never. */
  msSinceLastUsableState?: number;
  nowMs?: number;
};

/**
 * In-place embed recovery while the user stays on /tv.
 * - Orphan + !commandReady: remount (usable veto does not apply).
 * - Command-dead with live iframe: remount after TV_COMMAND_DEAD_MS.
 * - Dead iframe: remount after TV_EMBED_DEAD_IFRAME_MS.
 * Usable-state veto applies only when commandReady (anti-thrash healthy).
 */
export function shouldRecoverTvPlayerEmbed(opts: TvEmbedHealthProbe): boolean {
  if (!opts.playerVisible) return false;
  if (opts.startupInFlight) return false;
  if (!opts.firstPlayReached) return false;
  if (!opts.scheduleReady) return false;
  if (opts.embedRecoveryInFlight) return false;
  if (opts.msSinceLastRecovery < TV_EMBED_RECOVERY_COOLDOWN_MS) return false;

  if (opts.commandReady) {
    if (
      opts.msSinceLastUsableState != null &&
      opts.msSinceLastUsableState < TV_HEARTBEAT_USABLE_VETO_MS
    ) {
      return false;
    }
    return false;
  }

  const now = opts.nowMs ?? Date.now();
  const deadLongEnough =
    opts.deadIframeSinceMs != null &&
    now - opts.deadIframeSinceMs >= TV_EMBED_DEAD_IFRAME_MS;

  // Orphan binding: remount even if usable veto would apply to a live player.
  if (opts.orphanedRef) return true;

  const commandDeadLongEnough =
    opts.msSinceCommandDead != null &&
    opts.msSinceCommandDead >= TV_COMMAND_DEAD_MS;

  // Iframe still in DOM but command API gone.
  if (opts.iframeLive && commandDeadLongEnough) return true;

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
