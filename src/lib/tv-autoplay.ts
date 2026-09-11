import type { TvPlayerRef } from "@/components/tv/tv-player";
import {
  canRestoreSessionAudio,
  hasSessionAudioUnlocked,
  wantsSessionSound,
  writeTvMutePref,
  readTvMutePref,
  hasTvAudioUnlockedThisSession,
  TV_AUDIO_UNLOCKED_SESSION_KEY,
  TV_MUTE_PREF_KEY,
} from "@/lib/session-audio";
import { tracePlayVideoResult, tvTrace } from "@/lib/tvDebugLog";

/** Deferred audio state after mute-during-load programmatic transitions. */
export type PendingAudioRestore = {
  restoreUnmuted: boolean;
  shouldPlay: boolean;
};

export {
  hasTvAudioUnlockedThisSession,
  readTvMutePref,
  writeTvMutePref,
  TV_AUDIO_UNLOCKED_SESSION_KEY,
  TV_MUTE_PREF_KEY,
};

/** Unmute only — does not change play/pause (mute button). */
export function unmuteOnly(player: TvPlayerRef, source: string): void {
  if (!player.isReady()) return;
  player.unmute();
  player.setVolume(100);
  tvTrace("autoplay", "unmute_only", { source });
}

/** Unmute and play in one user-gesture stack (playlist clicks). */
export function unmuteAndPlay(player: TvPlayerRef, source: string): void {
  if (!player.isReady()) return;
  player.unmute();
  player.setVolume(100);
  tracePlayVideoResult(`${source}.play`, player.play());
}

/** @deprecated Use unmuteAndPlay — kept for gradual migration */
export function unmuteWithUserGesture(
  player: TvPlayerRef,
  source: string
): void {
  unmuteAndPlay(player, source);
}

export function prepareMutedLoadForAutoplay(
  player: TvPlayerRef,
  shouldPlay = true
): PendingAudioRestore {
  const wantsAudio = canRestoreSessionAudio();
  if (player.isReady() && !player.isMuted()) {
    player.mute();
    tvTrace("autoplay", "mute_before_load", { shouldPlay, wantsAudio });
  }
  return { restoreUnmuted: wantsAudio, shouldPlay };
}

/**
 * Play in the user-gesture stack after load (playlist / schedule clicks).
 * Always play only — never unmute. New ids are not CUED yet; unmute happens
 * in applyPendingAudioRestore on CUED/PLAYING.
 */
export function playWithUserGesture(
  player: TvPlayerRef,
  pending: PendingAudioRestore | null,
  source: string
): void {
  if (!player.isReady()) return;
  if (pending && pending.shouldPlay === false) return;
  tracePlayVideoResult(`${source}.gesture_play`, player.play());
}

const ALREADY_LOADED_STATES = new Set(["PLAYING", "BUFFERING", "CUED"]);

/**
 * Same-id replay: play in the gesture; unmute only when that id is already loaded.
 */
export function playAlreadyLoadedWithGesture(
  player: TvPlayerRef,
  pending: PendingAudioRestore | null,
  source: string
): void {
  if (!player.isReady()) return;
  if (pending?.shouldPlay ?? true) {
    tracePlayVideoResult(`${source}.replay_play`, player.play());
  }
  const state = player.getPlayerState?.() ?? null;
  if (pending?.restoreUnmuted && state && ALREADY_LOADED_STATES.has(state)) {
    unmuteOnly(player, `${source}.replay_restore`);
  }
}

/**
 * After programmatic load reaches PLAYING/CUED: play if needed.
 * Restores audio immediately when user has unlocked audio this session.
 */
export function applyPendingAudioRestore(
  player: TvPlayerRef,
  pending: PendingAudioRestore | null,
  source: string
): PendingAudioRestore | null {
  if (!player.isReady()) return pending;

  if (pending) {
    if (pending.shouldPlay) {
      tracePlayVideoResult(`${source}.muted_play`, player.play());
    }

    if (pending.restoreUnmuted && hasSessionAudioUnlocked()) {
      unmuteOnly(player, `${source}.session_restore`);
    } else {
      player.mute();
      tvTrace("autoplay", "session_mute_reapplied", { source });
    }

    return null;
  }

  if (canRestoreSessionAudio() && player.isMuted()) {
    unmuteOnly(player, `${source}.pref_fallback_restore`);
  } else if (readTvMutePref()) {
    player.mute();
    tvTrace("autoplay", "pref_mute_fallback", { source });
  }

  return null;
}

/** Payment resume: never programmatically unmute; play muted if was playing. */
export function applyPaymentPlaybackRestore(
  player: TvPlayerRef,
  opts: { wasMuted: boolean; wasPlaying: boolean },
  source: string
): PendingAudioRestore | null {
  if (!player.isReady()) return null;

  if (opts.wasMuted) {
    player.mute();
    if (opts.wasPlaying) {
      tracePlayVideoResult(`${source}.play`, player.play());
    }
    return null;
  }

  player.mute();
  if (opts.wasPlaying) {
    tracePlayVideoResult(`${source}.muted_play`, player.play());
  }
  tvTrace("autoplay", "payment_restore_muted", {
    source,
    wasPlaying: opts.wasPlaying,
  });
  return { restoreUnmuted: wantsSessionSound(), shouldPlay: false };
}
