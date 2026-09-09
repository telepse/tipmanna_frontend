/**
 * Locked TV playback contract — see product-behaviors/tv-system-product-behavior.md
 * (LOCKED PLAYBACK CONTRACT). These tests must fail if the gesture/CUED order regresses.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TvPlayerRef } from "@/components/tv/tv-player";
import {
  applyPendingAudioRestore,
  playWithUserGesture,
  prepareMutedLoadForAutoplay,
} from "@/lib/tv-autoplay";
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
  const map = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => map.clear(),
    },
    location: { search: "" },
  });
}

describe("TV playback contract — gesture stays muted until CUED", () => {
  beforeEach(() => {
    installBrowserGlobals();
  });

  it("playWithUserGesture never unmutes before the new id is CUED", () => {
    writeTvMutePref(false);
    const player = makePlayer();

    playWithUserGesture(
      player,
      { restoreUnmuted: true, shouldPlay: true },
      "contract"
    );

    expect(player.play).toHaveBeenCalled();
    expect(player.unmute).not.toHaveBeenCalled();
  });

  it("applyPendingAudioRestore plays muted then unmutes after CUED", () => {
    writeTvMutePref(false);
    const player = makePlayer();
    const order: string[] = [];
    player.play = vi.fn(() => order.push("play"));
    player.unmute = vi.fn(() => order.push("unmute"));
    const pending = prepareMutedLoadForAutoplay(player, true);

    applyPendingAudioRestore(player, pending, "contract.cued");

    expect(order).toEqual(["play", "unmute"]);
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

describe("TV playback contract — leave/return player lifecycle", () => {
  const tvPlayerSource = readFileSync(
    join(frontendRoot, "src/components/tv/tv-player.tsx"),
    "utf8"
  );

  it("does not reject onReady with module-level commandGeneration", () => {
    expect(tvPlayerSource).not.toContain("bumpTvCommandGeneration");
    expect(tvPlayerSource).not.toContain("isStaleTvCommandGeneration");
  });

  it("destroys the YT player on unmount, not in construct-effect cleanup", () => {
    expect(tvPlayerSource).toContain("shouldAcceptTvPlayerYtCallback");
    expect(tvPlayerSource).toContain("callbackEpochRef");
    expect(tvPlayerSource).toContain("shouldReuseExistingTvYtPlayer");
    const constructCleanup = tvPlayerSource.match(
      /return \(\) => \{\s*alive = false;[\s\S]*?\};\s*\}, \[\s*youtubeChildReleased/
    );
    expect(constructCleanup).toBeTruthy();
    expect(constructCleanup![0]).not.toContain("teardownImperativeMount");
    expect(constructCleanup![0]).not.toContain("clearWatchdog");
    expect(tvPlayerSource).toMatch(
      /useEffect\(\(\) => \{\s*return \(\) => \{\s*teardownImperativeMount\(\);/
    );
    expect(tvPlayerSource).not.toContain("destroyedRef");
  });

  it("isReady uses playback API only (isYoutubePlayerCommandReady)", () => {
    expect(tvPlayerSource).toContain(
      "isYoutubePlayerCommandReady(playerRef.current)"
    );
  });

  it("remount bumps embed generation without nulling playerRef while mounted", () => {
    expect(tvProviderSource).toMatch(
      /const remountPlayerForResume = useCallback\(\(reason: string\) => \{[\s\S]*?setStartupEmbedGeneration\(startupGenerationRef\.current\);[\s\S]*?\}, \[\]\);/
    );
    const remountBody = tvProviderSource.match(
      /const remountPlayerForResume = useCallback\([\s\S]*?\}, \[\]\);/
    )?.[0];
    expect(remountBody).toBeTruthy();
    expect(remountBody!).not.toContain("playerRef.current = null");
  });

  it("loopers key TvPlayer by startupEmbedGeneration for ref rebind", () => {
    const tvLooperSource = readFileSync(
      join(frontendRoot, "src/components/tv/tv-looper.tsx"),
      "utf8"
    );
    const homeLooperSource = readFileSync(
      join(frontendRoot, "src/components/tv/home-tv-looper.tsx"),
      "utf8"
    );
    expect(tvLooperSource).toContain("key={`tv-yt-${startupEmbedGeneration}`}");
    expect(homeLooperSource).toContain(
      "key={`tv-yt-${startupEmbedGeneration}`}"
    );
  });
});
