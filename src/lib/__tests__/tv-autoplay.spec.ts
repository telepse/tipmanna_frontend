import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TvPlayerRef } from "@/components/tv/tv-player";
import {
  TV_AUDIO_UNLOCKED_SESSION_KEY,
  TV_MUTE_PREF_KEY,
  applyPendingAudioRestore,
  applyPaymentPlaybackRestore,
  hasTvAudioUnlockedThisSession,
  playWithUserGesture,
  prepareMutedLoadForAutoplay,
  readTvMutePref,
  unmuteAndPlay,
  writeTvMutePref,
} from "@/lib/tv-autoplay";

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
}

function makePlayer(overrides: Partial<TvPlayerRef> = {}): TvPlayerRef {
  return {
    isReady: () => true,
    isMuted: () => false,
    mute: vi.fn(),
    unmute: vi.fn(),
    setVolume: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    pauseProgrammatic: vi.fn(),
    stop: vi.fn(),
    getDuration: () => 120,
    getCurrentTime: () => 0,
    seekTo: vi.fn(),
    load: vi.fn(),
    getPlayerState: () => "PLAYING",
    syncMuteFromPlayer: vi.fn(),
    ...overrides,
  };
}

function installBrowserGlobals(initial: Record<string, string> = {}) {
  const storage = makeStorage(initial);
  vi.stubGlobal("window", {
    sessionStorage: storage,
    location: { search: "" },
  });
  return storage;
}

describe("readTvMutePref / writeTvMutePref", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("defaults to muted when no preference is stored", () => {
    expect(readTvMutePref()).toBe(true);
  });

  it("persists unmute preference and unlock flag", () => {
    writeTvMutePref(false);
    expect(readTvMutePref()).toBe(false);
    expect(hasTvAudioUnlockedThisSession()).toBe(true);
    expect(window.sessionStorage.getItem(TV_MUTE_PREF_KEY)).toBe("0");
    expect(window.sessionStorage.getItem(TV_AUDIO_UNLOCKED_SESSION_KEY)).toBe(
      "1"
    );
  });

  it("clears unlock intent when user mutes again", () => {
    writeTvMutePref(false);
    writeTvMutePref(true);
    expect(readTvMutePref()).toBe(true);
    expect(window.sessionStorage.getItem(TV_MUTE_PREF_KEY)).toBe("1");
  });
});

describe("prepareMutedLoadForAutoplay", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("derives restore intent from session mute pref, not transient player mute", () => {
    writeTvMutePref(false);
    const player = makePlayer({ isMuted: () => true });

    expect(prepareMutedLoadForAutoplay(player, true)).toEqual({
      restoreUnmuted: true,
      shouldPlay: true,
    });
  });

  it("does not restore audio when user has not unlocked audio this session", () => {
    const player = makePlayer({ isMuted: () => false });

    expect(prepareMutedLoadForAutoplay(player, true)).toEqual({
      restoreUnmuted: false,
      shouldPlay: true,
    });
    expect(player.mute).toHaveBeenCalled();
  });
});

describe("applyPendingAudioRestore", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("restores from session pref when pending is null", () => {
    writeTvMutePref(false);
    const player = makePlayer({ isMuted: () => true });

    expect(applyPendingAudioRestore(player, null, "test")).toBeNull();
    expect(player.unmute).toHaveBeenCalled();
  });

  it("clears pending after successful restore", () => {
    writeTvMutePref(false);
    const player = makePlayer({ isMuted: () => true });
    const pending = { restoreUnmuted: true, shouldPlay: true };

    expect(applyPendingAudioRestore(player, pending, "test")).toBeNull();
    expect(player.play).toHaveBeenCalled();
    expect(player.unmute).toHaveBeenCalled();
  });

  it("auto-advance (non-gesture) restores session audio after muted load", () => {
    writeTvMutePref(false);
    const player = makePlayer({ isMuted: () => true });
    const pending = prepareMutedLoadForAutoplay(player, true);

    expect(pending).toEqual({ restoreUnmuted: true, shouldPlay: true });
    expect(
      applyPendingAudioRestore(player, pending, "auto_advance")
    ).toBeNull();
    expect(player.play).toHaveBeenCalled();
    expect(player.unmute).toHaveBeenCalled();
  });
});

describe("playWithUserGesture / unmuteAndPlay", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("playWithUserGesture unmutes then plays when pending requests restore", () => {
    writeTvMutePref(false);
    const player = makePlayer({ isMuted: () => true });
    const callOrder: string[] = [];
    player.unmute = vi.fn(() => callOrder.push("unmute"));
    player.play = vi.fn(() => callOrder.push("play"));

    playWithUserGesture(
      player,
      { restoreUnmuted: true, shouldPlay: true },
      "gesture"
    );

    expect(callOrder).toEqual(["unmute", "play"]);
    expect(player.setVolume).toHaveBeenCalledWith(100);
  });

  it("playWithUserGesture plays only when session has not unlocked audio", () => {
    const player = makePlayer({ isMuted: () => true });
    playWithUserGesture(
      player,
      { restoreUnmuted: false, shouldPlay: true },
      "gesture"
    );
    expect(player.play).toHaveBeenCalled();
    expect(player.unmute).not.toHaveBeenCalled();
  });

  it("unmuteAndPlay unmutes then plays in gesture stack", () => {
    const player = makePlayer({ isMuted: () => true });
    const callOrder: string[] = [];
    player.unmute = vi.fn(() => callOrder.push("unmute"));
    player.play = vi.fn(() => callOrder.push("play"));

    unmuteAndPlay(player, "click");

    expect(callOrder).toEqual(["unmute", "play"]);
    expect(player.setVolume).toHaveBeenCalledWith(100);
  });
});

describe("applyPaymentPlaybackRestore", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("uses session pref snapshot: queues restore when user was unmuted", () => {
    writeTvMutePref(false);
    const player = makePlayer({ isMuted: () => true });

    expect(
      applyPaymentPlaybackRestore(
        player,
        { wasMuted: false, wasPlaying: true },
        "test"
      )
    ).toEqual({ restoreUnmuted: true, shouldPlay: false });
    expect(player.mute).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalled();
    expect(player.unmute).not.toHaveBeenCalled();
  });

  it("respects muted pref snapshot without queuing restore", () => {
    writeTvMutePref(true);
    const player = makePlayer({ isMuted: () => true });

    expect(
      applyPaymentPlaybackRestore(
        player,
        { wasMuted: true, wasPlaying: true },
        "test"
      )
    ).toBeNull();
    expect(player.mute).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalled();
  });
});
