import { describe, expect, it, afterEach } from "vitest";

import {
  allocateTvEmbedGeneration,
  isTvPlayerStateUsable,
  resetTvEmbedGenerationForTests,
  shouldForceEmbedRemount,
  shouldRemountTvPlayer,
  TV_EMBED_ONREADY_TIMEOUT_MS,
} from "@/lib/tv-player-resume";

const alive = {
  documentWasHidden: true,
  visibilityState: "visible" as const,
  startupInFlight: false,
  firstPlayReached: true,
  iframeLive: true,
  commandReady: true,
  playerState: "PLAYING",
  remountedThisHideShowCycle: false,
};

describe("allocateTvEmbedGeneration", () => {
  afterEach(() => {
    resetTvEmbedGenerationForTests();
  });

  it("returns monotonically increasing ids", () => {
    expect(allocateTvEmbedGeneration()).toBe(1);
    expect(allocateTvEmbedGeneration()).toBe(2);
    expect(allocateTvEmbedGeneration()).toBe(3);
  });
});

describe("isTvPlayerStateUsable", () => {
  it("accepts live playback states", () => {
    expect(isTvPlayerStateUsable("PLAYING")).toBe(true);
    expect(isTvPlayerStateUsable("PAUSED")).toBe(true);
    expect(isTvPlayerStateUsable("BUFFERING")).toBe(true);
    expect(isTvPlayerStateUsable("CUED")).toBe(true);
    expect(isTvPlayerStateUsable("ENDED")).toBe(true);
  });

  it("rejects null and UNSTARTED", () => {
    expect(isTvPlayerStateUsable(null)).toBe(false);
    expect(isTvPlayerStateUsable("UNSTARTED")).toBe(false);
  });
});

describe("shouldRemountTvPlayer", () => {
  it("does not remount a healthy player after hide→show", () => {
    expect(shouldRemountTvPlayer(alive)).toBe(false);
  });

  it("does not remount during startup", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        startupInFlight: true,
        commandReady: false,
        iframeLive: false,
        playerState: null,
      })
    ).toBe(false);
  });

  it("does not remount before first play", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        firstPlayReached: false,
        commandReady: false,
        iframeLive: false,
        playerState: null,
      })
    ).toBe(false);
  });

  it("does not remount when the document never hid", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        documentWasHidden: false,
        commandReady: false,
        iframeLive: false,
        playerState: null,
      })
    ).toBe(false);
  });

  it("does not remount twice in the same hide→show cycle", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        remountedThisHideShowCycle: true,
        commandReady: false,
        iframeLive: false,
        playerState: null,
      })
    ).toBe(false);
  });

  it("remounts when the iframe is detached", () => {
    expect(shouldRemountTvPlayer({ ...alive, iframeLive: false })).toBe(true);
  });

  it("remounts when command APIs are not ready", () => {
    expect(shouldRemountTvPlayer({ ...alive, commandReady: false })).toBe(true);
  });

  it("remounts when probe state is unusable", () => {
    expect(shouldRemountTvPlayer({ ...alive, playerState: null })).toBe(true);
    expect(shouldRemountTvPlayer({ ...alive, playerState: "UNSTARTED" })).toBe(
      true
    );
  });
});

describe("shouldForceEmbedRemount", () => {
  const base = {
    youtubeChildReleased: true,
    hasVideoId: true,
    onReadyFired: false,
    elapsedMs: TV_EMBED_ONREADY_TIMEOUT_MS,
    remountCount: 0,
  };

  it("returns false before timeout", () => {
    expect(
      shouldForceEmbedRemount({
        ...base,
        elapsedMs: TV_EMBED_ONREADY_TIMEOUT_MS - 1,
      })
    ).toBe(false);
  });

  it("returns false without video id", () => {
    expect(shouldForceEmbedRemount({ ...base, hasVideoId: false })).toBe(false);
  });

  it("returns false after onReady fired", () => {
    expect(shouldForceEmbedRemount({ ...base, onReadyFired: true })).toBe(
      false
    );
  });

  it("returns false when remount cap reached", () => {
    expect(shouldForceEmbedRemount({ ...base, remountCount: 1 })).toBe(false);
  });

  it("returns true after timeout when child is up and onReady never fired", () => {
    expect(shouldForceEmbedRemount(base)).toBe(true);
  });

  it("does not require documentWasHidden (SPA route return)", () => {
    expect(
      shouldForceEmbedRemount({
        ...base,
        youtubeChildReleased: true,
      })
    ).toBe(true);
  });
});
