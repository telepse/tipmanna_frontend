/** Canonical session sound preference (Explore, content, channel, TV). */
export const SESSION_SOUND_ON_KEY = "tipmanna_session_sound_on";

/** User unmuted at least once this tab session (required for TV programmatic restore). */
export const SESSION_AUDIO_UNLOCKED_KEY = "tipmanna_session_audio_unlocked";

/** Legacy keys — read once for migration, then write canonical only. */
const LEGACY_REEL_SOUND_ON_KEY = "tipmanna_yt_explore_sound_on";
const LEGACY_TV_MUTE_PREF_KEY = "tipmanna_tv_mute_pref";
const LEGACY_TV_AUDIO_UNLOCKED_KEY = "tipmanna_tv_audio_unlocked";

function readStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage?.setItem(key, value);
  } catch {
    /* noop */
  }
}

/** Import legacy reel/TV keys into canonical storage when canonical is unset. */
export function migrateLegacySessionAudioKeys(): void {
  if (typeof window === "undefined") return;

  const canonical = readStorage(SESSION_SOUND_ON_KEY);
  if (canonical != null) return;

  const legacyReel = readStorage(LEGACY_REEL_SOUND_ON_KEY);
  const legacyTvMute = readStorage(LEGACY_TV_MUTE_PREF_KEY);
  const legacyTvUnlocked = readStorage(LEGACY_TV_AUDIO_UNLOCKED_KEY);

  const soundOn =
    legacyReel === "1" || legacyTvMute === "0" || legacyTvUnlocked === "1";

  writeStorage(SESSION_SOUND_ON_KEY, soundOn ? "1" : "0");

  if (legacyTvUnlocked === "1" || legacyReel === "1" || legacyTvMute === "0") {
    writeStorage(SESSION_AUDIO_UNLOCKED_KEY, "1");
  }
}

/** True when the viewer wants sound on for this session. */
export function wantsSessionSound(): boolean {
  migrateLegacySessionAudioKeys();
  return readStorage(SESSION_SOUND_ON_KEY) === "1";
}

/** True after an explicit unmute in this tab (TV restore after programmatic mute). */
export function hasSessionAudioUnlocked(): boolean {
  migrateLegacySessionAudioKeys();
  return readStorage(SESSION_AUDIO_UNLOCKED_KEY) === "1";
}

/** Persist want-sound; unmuting also marks the session as gesture-unlocked. */
export function setSessionSoundOn(on: boolean): void {
  migrateLegacySessionAudioKeys();
  writeStorage(SESSION_SOUND_ON_KEY, on ? "1" : "0");
  if (on) {
    writeStorage(SESSION_AUDIO_UNLOCKED_KEY, "1");
  }
  // Keep legacy keys in sync for any stale readers during rollout.
  writeStorage(LEGACY_REEL_SOUND_ON_KEY, on ? "1" : "0");
  writeStorage(LEGACY_TV_MUTE_PREF_KEY, on ? "0" : "1");
  if (on) {
    writeStorage(LEGACY_TV_AUDIO_UNLOCKED_KEY, "1");
  }
}

/** TV-style muted read: default muted when unset. */
export function readSessionMuted(): boolean {
  return !wantsSessionSound();
}

/** Whether programmatic TV loads may restore audio after PLAYING. */
export function canRestoreSessionAudio(): boolean {
  return wantsSessionSound() && hasSessionAudioUnlocked();
}

/** @deprecated Use wantsSessionSound — Explore reel alias. */
export function loadReelSoundPref(): boolean {
  return wantsSessionSound();
}

/** @deprecated Use setSessionSoundOn — Explore reel alias. */
export function persistReelSoundPref(on: boolean): void {
  setSessionSoundOn(on);
}

/** @deprecated Use readSessionMuted — TV alias. */
export function readTvMutePref(): boolean {
  return !wantsSessionSound();
}

/** @deprecated Use setSessionSoundOn — TV alias. */
export function writeTvMutePref(muted: boolean): void {
  setSessionSoundOn(!muted);
}

/** @deprecated Use hasSessionAudioUnlocked — TV alias. */
export function hasTvAudioUnlockedThisSession(): boolean {
  return hasSessionAudioUnlocked();
}

export const TV_MUTE_PREF_KEY = LEGACY_TV_MUTE_PREF_KEY;
export const TV_AUDIO_UNLOCKED_SESSION_KEY = LEGACY_TV_AUDIO_UNLOCKED_KEY;
