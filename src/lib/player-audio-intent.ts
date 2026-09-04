import {
  hasSessionAudioUnlocked,
  readSessionMuted,
  setSessionSoundOn,
} from "@/lib/session-audio";

/** Grace window after explicit user mute/unmute — ignore player-reported mute during this period. */
export const PLAYER_AUDIO_INTENT_GRACE_MS = 1_000;

/**
 * When the session preference is unmuted and the user has unlocked audio,
 * a freshly created YouTube iframe reporting muted must not overwrite user intent.
 */
export function shouldSuppressPlayerMuteSync(
  playerMuted: boolean,
  prefMuted: boolean = readSessionMuted(),
  unlocked: boolean = hasSessionAudioUnlocked()
): boolean {
  return playerMuted && !prefMuted && unlocked;
}

export function markPlayerAudioIntentGrace(
  graceUntilRef: { current: number },
  ms: number = PLAYER_AUDIO_INTENT_GRACE_MS
): void {
  graceUntilRef.current = Date.now() + ms;
}

export function isInsidePlayerAudioIntentGrace(graceUntilRef: {
  current: number;
}): boolean {
  return Date.now() < graceUntilRef.current;
}

/** Apply session mute preference to a generic player surface. */
export function applySessionMuteToPlayer(
  player: {
    mute: () => void;
    unmute: () => void;
    setVolume?: (v: number) => void;
  },
  muted: boolean
): void {
  if (muted) {
    player.mute();
  } else {
    player.unmute();
    player.setVolume?.(100);
  }
  setSessionSoundOn(!muted);
}
