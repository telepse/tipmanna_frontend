/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  canRestoreSessionAudio,
  hasSessionAudioUnlocked,
  migrateLegacySessionAudioKeys,
  SESSION_AUDIO_UNLOCKED_KEY,
  SESSION_SOUND_ON_KEY,
  setSessionSoundOn,
  wantsSessionSound,
} from "@/lib/session-audio";

describe("session-audio", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("defaults to sound off and locked", () => {
    expect(wantsSessionSound()).toBe(false);
    expect(hasSessionAudioUnlocked()).toBe(false);
    expect(canRestoreSessionAudio()).toBe(false);
  });

  it("migrates legacy explore sound key", () => {
    window.sessionStorage.setItem("tipmanna_yt_explore_sound_on", "1");
    migrateLegacySessionAudioKeys();
    expect(window.sessionStorage.getItem(SESSION_SOUND_ON_KEY)).toBe("1");
    expect(wantsSessionSound()).toBe(true);
  });

  it("migrates legacy TV mute pref (unmuted)", () => {
    window.sessionStorage.setItem("tipmanna_tv_mute_pref", "0");
    migrateLegacySessionAudioKeys();
    expect(wantsSessionSound()).toBe(true);
    expect(window.sessionStorage.getItem(SESSION_AUDIO_UNLOCKED_KEY)).toBe("1");
  });

  it("setSessionSoundOn unlocks audio for TV restore", () => {
    setSessionSoundOn(true);
    expect(wantsSessionSound()).toBe(true);
    expect(hasSessionAudioUnlocked()).toBe(true);
    expect(canRestoreSessionAudio()).toBe(true);
  });

  it("does not restore TV audio when sound pref off", () => {
    window.sessionStorage.setItem(SESSION_SOUND_ON_KEY, "0");
    window.sessionStorage.setItem(SESSION_AUDIO_UNLOCKED_KEY, "1");
    expect(canRestoreSessionAudio()).toBe(false);
  });
});
