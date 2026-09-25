import { describe, expect, it, afterEach } from "vitest";

import {
  allocateTvEmbedGeneration,
  isTvPlayerStateUsable,
  resetTvEmbedGenerationForTests,
  shouldAcceptTvPlayerYtCallback,
  shouldClearEmbedRecoveryInFlight,
  shouldForceEmbedRemount,
  shouldRecoverTvPlayerEmbed,
  shouldRemountTvPlayer,
  shouldReplaceTvYtPlayer,
  shouldReuseExistingTvYtPlayer,
  TV_EMBED_DEAD_IFRAME_MS,
  TV_EMBED_ONREADY_TIMEOUT_MS,
  TV_EMBED_RECOVERY_COOLDOWN_MS,
  TV_EMBED_RECOVERY_LATCH_MS,
  TV_HEARTBEAT_USABLE_VETO_MS,
  TV_HIDE_REMOUNT_MS,
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
  hiddenDurationMs: TV_HIDE_REMOUNT_MS,
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

  it("does not remount on iframe flicker when command API still works", () => {
    expect(shouldRemountTvPlayer({ ...alive, iframeLive: false })).toBe(false);
  });

  it("does not remount on brief hide when iframe and command API are both gone", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        iframeLive: false,
        commandReady: false,
        playerState: "UNSTARTED",
        hiddenDurationMs: 5_000,
      })
    ).toBe(false);
  });

  it("remounts after long hide when iframe is detached, command API is gone, and state is not usable", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        iframeLive: false,
        commandReady: false,
        playerState: "UNSTARTED",
        hiddenDurationMs: TV_HIDE_REMOUNT_MS,
      })
    ).toBe(true);
  });

  it("does not remount when command APIs are not ready but iframe is still live", () => {
    expect(shouldRemountTvPlayer({ ...alive, commandReady: false })).toBe(
      false
    );
  });

  it("does not remount a usable PLAYING or PAUSED row with a live iframe", () => {
    expect(
      shouldRemountTvPlayer({
        ...alive,
        commandReady: false,
        playerState: "PLAYING",
      })
    ).toBe(false);
    expect(
      shouldRemountTvPlayer({
        ...alive,
        commandReady: false,
        playerState: "PAUSED",
      })
    ).toBe(false);
  });

  it("does not remount when iframe and command API are healthy despite UNSTARTED state", () => {
    expect(shouldRemountTvPlayer({ ...alive, playerState: null })).toBe(false);
    expect(shouldRemountTvPlayer({ ...alive, playerState: "UNSTARTED" })).toBe(
      false
    );
  });
});

describe("shouldRecoverTvPlayerEmbed", () => {
  const healthy = {
    playerVisible: true,
    startupInFlight: false,
    firstPlayReached: true,
    scheduleReady: true,
    commandReady: true,
    iframeLive: true,
    playerState: "PLAYING" as string | null,
    orphanedRef: false,
    embedRecoveryInFlight: false,
    msSinceLastRecovery: TV_EMBED_RECOVERY_COOLDOWN_MS,
    deadIframeSinceMs: null as number | null,
    nowMs: 20_000,
  };

  it("recovers when the provider ref is orphaned after cooldown and iframe is dead", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        orphanedRef: true,
        commandReady: false,
        iframeLive: false,
        playerState: "UNSTARTED",
      })
    ).toBe(true);
  });

  it("does not recover an orphan during in-flight remount or cooldown", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        orphanedRef: true,
        commandReady: false,
        iframeLive: false,
        playerState: "UNSTARTED",
        embedRecoveryInFlight: true,
      })
    ).toBe(false);
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        orphanedRef: true,
        commandReady: false,
        iframeLive: false,
        playerState: "UNSTARTED",
        msSinceLastRecovery: 100,
      })
    ).toBe(false);
  });

  it("does not recover a PLAYING or BUFFERING row", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        commandReady: false,
        iframeLive: false,
        playerState: "PLAYING",
        deadIframeSinceMs: 20_000 - TV_EMBED_DEAD_IFRAME_MS + 1,
      })
    ).toBe(false);
  });

  it("does not recover when iframe flickers but command API still works", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        iframeLive: false,
        commandReady: true,
        deadIframeSinceMs: 20_000 - TV_EMBED_DEAD_IFRAME_MS,
      })
    ).toBe(false);
  });

  it("does not recover when playback was usable recently despite dead iframe", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        iframeLive: false,
        commandReady: false,
        playerState: "UNSTARTED",
        deadIframeSinceMs: 20_000 - TV_EMBED_DEAD_IFRAME_MS,
        msSinceLastUsableState: 2_000,
      })
    ).toBe(false);
  });

  it("recovers after sustained dead iframe when command API is gone and no recent usable state", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        iframeLive: false,
        commandReady: false,
        playerState: "UNSTARTED",
        deadIframeSinceMs: 20_000 - TV_EMBED_DEAD_IFRAME_MS,
        msSinceLastUsableState: TV_HEARTBEAT_USABLE_VETO_MS,
      })
    ).toBe(true);
  });

  it("recovers after first play even when C0 guard env is off (firstPlayReached from provider)", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        firstPlayReached: true,
        orphanedRef: true,
        commandReady: false,
        iframeLive: false,
        playerState: "UNSTARTED",
      })
    ).toBe(true);
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        firstPlayReached: false,
        orphanedRef: true,
        commandReady: false,
        iframeLive: false,
        playerState: "UNSTARTED",
      })
    ).toBe(false);
  });

  it("does not recover during startup or cooldown", () => {
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        startupInFlight: true,
        iframeLive: false,
        deadIframeSinceMs: 0,
      })
    ).toBe(false);
    expect(
      shouldRecoverTvPlayerEmbed({
        ...healthy,
        iframeLive: false,
        msSinceLastRecovery: 100,
        deadIframeSinceMs: 0,
      })
    ).toBe(false);
  });
});

describe("shouldClearEmbedRecoveryInFlight", () => {
  it("clears latch after timeout when embed is still not command-ready", () => {
    expect(
      shouldClearEmbedRecoveryInFlight({
        embedRecoveryInFlight: true,
        commandReady: false,
        elapsedMs: TV_EMBED_RECOVERY_LATCH_MS,
      })
    ).toBe(true);
  });

  it("does not clear at the old 4s onReady timeout", () => {
    expect(
      shouldClearEmbedRecoveryInFlight({
        embedRecoveryInFlight: true,
        commandReady: false,
        elapsedMs: TV_EMBED_ONREADY_TIMEOUT_MS,
      })
    ).toBe(false);
  });

  it("does not clear while command-ready or before timeout", () => {
    expect(
      shouldClearEmbedRecoveryInFlight({
        embedRecoveryInFlight: true,
        commandReady: true,
        elapsedMs: TV_EMBED_RECOVERY_LATCH_MS,
      })
    ).toBe(false);
    expect(
      shouldClearEmbedRecoveryInFlight({
        embedRecoveryInFlight: true,
        commandReady: false,
        elapsedMs: TV_EMBED_RECOVERY_LATCH_MS - 1,
      })
    ).toBe(false);
  });
});

describe("shouldForceEmbedRemount", () => {
  const base = {
    youtubeChildReleased: true,
    hasVideoId: true,
    onReadyFired: false,
    elapsedMs: TV_EMBED_ONREADY_TIMEOUT_MS,
    remountCount: 0,
    iframeLive: false,
    commandReady: false,
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

  it("returns false when playback API is already command-ready", () => {
    expect(shouldForceEmbedRemount({ ...base, commandReady: true })).toBe(
      false
    );
  });

  it("returns false when iframe is still live", () => {
    expect(shouldForceEmbedRemount({ ...base, iframeLive: true })).toBe(false);
  });

  it("returns false when remount cap reached", () => {
    expect(shouldForceEmbedRemount({ ...base, remountCount: 1 })).toBe(false);
  });

  it("returns true after timeout when iframe is dead and API is gone", () => {
    expect(shouldForceEmbedRemount(base)).toBe(true);
  });
});

describe("shouldAcceptTvPlayerYtCallback", () => {
  it("accepts callbacks only for the active construct epoch", () => {
    expect(shouldAcceptTvPlayerYtCallback(2, 2)).toBe(true);
    expect(shouldAcceptTvPlayerYtCallback(1, 2)).toBe(false);
    expect(shouldAcceptTvPlayerYtCallback(2, 3)).toBe(false);
  });
});

describe("shouldReuseExistingTvYtPlayer / shouldReplaceTvYtPlayer", () => {
  it("reuses the player across construct-effect re-runs with the same key", () => {
    expect(
      shouldReuseExistingTvYtPlayer({
        hasPlayer: true,
        constructKey: "1:abc",
        constructedKey: "1:abc",
      })
    ).toBe(true);
    expect(
      shouldReplaceTvYtPlayer({
        hasPlayer: true,
        constructKey: "1:abc",
        constructedKey: "1:abc",
      })
    ).toBe(false);
  });

  it("replaces the player when startup generation or video id changes", () => {
    expect(
      shouldReuseExistingTvYtPlayer({
        hasPlayer: true,
        constructKey: "2:abc",
        constructedKey: "1:abc",
      })
    ).toBe(false);
    expect(
      shouldReplaceTvYtPlayer({
        hasPlayer: true,
        constructKey: "2:abc",
        constructedKey: "1:abc",
      })
    ).toBe(true);
  });

  it("does not replace when no player exists yet", () => {
    expect(
      shouldReplaceTvYtPlayer({
        hasPlayer: false,
        constructKey: "1:abc",
        constructedKey: null,
      })
    ).toBe(false);
  });
});
