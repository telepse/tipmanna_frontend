import type { TvPlayerRef } from "@/components/tv/tv-player";
import { tracePlayVideoResult, tvTrace } from "@/lib/tvDebugLog";

/** Deferred audio state after mute-during-load programmatic transitions. */
export type PendingAudioRestore = {
  restoreUnmuted: boolean;
  shouldPlay: boolean;
};

export function unmuteWithUserGesture(
  player: TvPlayerRef,
  source: string
): void {
  if (!player.isReady()) return;
  player.unmute();
  player.setVolume(100);
  tracePlayVideoResult(`${source}.play`, player.play());
}

/**
 * Mute before programmatic load when unmuted so autoplay policy allows play().
 * Returns pending restore state (never auto-unmutes without gesture).
 */
export function prepareMutedLoadForAutoplay(
  player: TvPlayerRef,
  shouldPlay = true
): PendingAudioRestore {
  const wasUnmuted = player.isReady() && !player.isMuted();
  if (wasUnmuted) {
    player.mute();
    tvTrace("autoplay", "mute_before_load", { shouldPlay });
  }
  return { restoreUnmuted: wasUnmuted, shouldPlay };
}

/** Play in user-gesture stack after load (LOCAL playlist clicks). */
export function playWithUserGesture(
  player: TvPlayerRef,
  pending: PendingAudioRestore | null,
  source: string
): void {
  if (!player.isReady()) return;
  if (pending?.restoreUnmuted) {
    unmuteWithUserGesture(player, source);
    return;
  }
  if (pending?.shouldPlay ?? true) {
    tracePlayVideoResult(`${source}.gesture_play`, player.play());
  }
}

/**
 * After programmatic load reaches PLAYING/CUED: play if needed; defer unmute to user gesture.
 */
export function applyPendingAudioRestore(
  player: TvPlayerRef,
  pending: PendingAudioRestore | null,
  source: string
): PendingAudioRestore | null {
  if (!pending || !player.isReady()) return pending;

  if (pending.shouldPlay) {
    tracePlayVideoResult(`${source}.muted_play`, player.play());
  }

  if (pending.restoreUnmuted) {
    tvTrace("autoplay", "audio_restore_deferred", {
      source,
      reason: "gesture_required",
    });
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
  return { restoreUnmuted: true, shouldPlay: false };
}
