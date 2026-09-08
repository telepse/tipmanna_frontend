/** Max wait for YouTube onReady after SPA remount before forcing embed remount. */
export const TV_EMBED_ONREADY_TIMEOUT_MS = 4000;

/** Max watchdog remounts per TVProvider mount (prevents infinite loops). */
export const TV_EMBED_ONREADY_MAX_REMOUNTS = 1;

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

/**
 * Remount only after a real hide→show (or bfcache pageshow) when the iframe
 * is dead. Never remount during startup or on every visibility tick.
 */
export function shouldRemountTvPlayer(opts: TvPlayerResumeProbe): boolean {
  if (opts.visibilityState !== "visible") return false;
  if (!opts.documentWasHidden) return false;
  if (opts.startupInFlight) return false;
  if (!opts.firstPlayReached) return false;
  if (opts.remountedThisHideShowCycle) return false;
  if (!opts.commandReady || !opts.iframeLive) return true;
  if (!isTvPlayerStateUsable(opts.playerState)) return true;
  return false;
}

/**
 * SPA remount recovery: warm window.YT present but onReady never fires.
 * Does not require documentWasHidden or firstPlayReached.
 */
export function shouldForceEmbedRemount(
  opts: TvEmbedOnReadyWatchdogInput
): boolean {
  const timeoutMs = opts.timeoutMs ?? TV_EMBED_ONREADY_TIMEOUT_MS;
  const maxRemounts = opts.maxRemounts ?? TV_EMBED_ONREADY_MAX_REMOUNTS;
  if (!opts.youtubeChildReleased) return false;
  if (!opts.hasVideoId) return false;
  if (opts.onReadyFired) return false;
  if (opts.elapsedMs < timeoutMs) return false;
  if (opts.remountCount >= maxRemounts) return false;
  return true;
}

/** Ignore YouTube callbacks after this player instance was torn down. */
export function shouldAcceptTvPlayerYtCallback(destroyed: boolean): boolean {
  return !destroyed;
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
