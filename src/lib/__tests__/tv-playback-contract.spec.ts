/**
 * Locked TV playback contract — see product-behaviors/tv-system-product-behavior.md
 * (LOCKED PLAYBACK CONTRACT). These tests must fail if the gesture order regresses.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TvPlayerRef } from "@/components/tv/tv-player";
import { playWithUserGesture, unmuteAndPlay } from "@/lib/tv-autoplay";
import { writeTvMutePref } from "@/lib/session-audio";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const tvProviderSource = readFileSync(
  join(frontendRoot, "src/components/tv-provider.tsx"),
  "utf8"
);

function makePlayer(): TvPlayerRef {
  return {
    isReady: () => true,
    isMuted: () => true,
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
  };
}

function installBrowserGlobals() {
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    location: { search: "" },
  });
}

describe("TV playback contract — gesture order", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("unmuteAndPlay must unmute before play (never play-then-unmute)", () => {
    const player = makePlayer();
    const order: string[] = [];
    player.unmute = vi.fn(() => order.push("unmute"));
    player.play = vi.fn(() => order.push("play"));

    unmuteAndPlay(player, "contract");

    expect(order.indexOf("unmute")).toBeLessThan(order.indexOf("play"));
  });

  it("playWithUserGesture with restore uses unmute-then-play path", () => {
    writeTvMutePref(false);
    const player = makePlayer();
    const order: string[] = [];
    player.unmute = vi.fn(() => order.push("unmute"));
    player.play = vi.fn(() => order.push("play"));

    playWithUserGesture(
      player,
      { restoreUnmuted: true, shouldPlay: true },
      "contract"
    );

    expect(order).toEqual(["unmute", "play"]);
  });
});

describe("TV playback contract — requestPlayback must not gesture-play after load", () => {
  it("requestPlayback does not call playWithUserGesture immediately after player.load", () => {
    expect(tvProviderSource).not.toMatch(
      /player\.load\([^)]+\);\s*\n\s*if \(isUserIntentPlaybackReason/
    );
    expect(tvProviderSource).not.toContain('"requestPlayback.user_intent"');
  });

  it("requestPlayback skip_reload path does not inject play on syncToLive", () => {
    expect(tvProviderSource).not.toContain("requestPlayback.skip_reload_play");
  });
});
