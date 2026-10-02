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

  it("Go Live resets lastSyncedIndex and calls syncToLive without resolveGoLiveAction", () => {
    expect(tvProviderSource).not.toContain("resolveGoLiveAction");
    expect(tvProviderSource).toContain("lastSyncedIndex.current = -1");
    expect(tvProviderSource).toContain("syncToLive()");
    expect(tvProviderSource).toMatch(
      /prepareMutedLoadForAutoplay\(\s*player,\s*true\s*\)/
    );
    expect(tvProviderSource).not.toMatch(
      /prepareMutedLoadForAutoplay\(\s*player,\s*true,\s*req\.videoId/
    );
  });

  it("onPlayerReady applies session mute pref (mute or unmute)", () => {
    const controlsSource = readFileSync(
      join(frontendRoot, "src/hooks/use-tv-player-controls.ts"),
      "utf8"
    );
    const readyFn = controlsSource.match(
      /const onPlayerReady = useCallback\(\(\) => \{[\s\S]*?\}, \[isMuted, playerRef, syncFromPlayer\]\);/
    )?.[0];
    expect(readyFn).toBeTruthy();
    expect(readyFn!).toContain("player.unmute()");
    expect(readyFn!).toContain("player.setVolume(100)");
    expect(readyFn!).toContain("if (targetMuted)");
  });

  it("applyPendingAudioRestore re-applies mute when session pref is muted", () => {
    const autoplaySource = readFileSync(
      join(frontendRoot, "src/lib/tv-autoplay.ts"),
      "utf8"
    );
    expect(autoplaySource).toContain("session_mute_reapplied");
    expect(autoplaySource).toMatch(
      /if \(pending\.restoreUnmuted && hasSessionAudioUnlocked\(\)\)/
    );
  });

  it("firstPlayReached is marked on PLAYING without C0 env gate", () => {
    expect(tvProviderSource).toMatch(
      /const firstPlayThisEvent = markStartupFirstPlay\(guard\);/
    );
    expect(tvProviderSource).toMatch(
      /if \(guardEnabled && firstPlayThisEvent\)/
    );
  });

  it("command-dead remount restores anti-trap recovery timers", () => {
    const resumeSource = readFileSync(
      join(frontendRoot, "src/lib/tv-player-resume.ts"),
      "utf8"
    );
    expect(resumeSource).toContain("shouldRemountTvPlayer");
    expect(resumeSource).toContain("shouldRecoverTvPlayerEmbed");
    expect(resumeSource).toContain("TV_COMMAND_DEAD_MS = 3000");
    expect(resumeSource).toContain("TV_EMBED_DEAD_IFRAME_MS = 8000");
    expect(resumeSource).toContain("TV_EMBED_RECOVERY_COOLDOWN_MS = 8000");
    expect(resumeSource).toContain("TV_EMBED_RECOVERY_LATCH_MS = 8000");
    expect(resumeSource).toMatch(/if \(opts\.commandReady\) return false;/);
    expect(resumeSource).toMatch(/if \(opts\.iframeLive\) return true;/);
    expect(resumeSource).toContain("if (opts.orphanedRef) return true;");
    expect(tvProviderSource).toContain("msSinceCommandDead");
    expect(tvProviderSource).toContain("playerState,");
  });

  it("durable Go Live sets pendingLiveSync when syncToLive is blocked", () => {
    expect(tvProviderSource).toContain("pendingLiveSyncRef");
    expect(tvProviderSource).toContain("const handled = syncToLive()");
    expect(tvProviderSource).toContain("pending_live_sync_created");
    expect(tvProviderSource).toContain("pending_live_sync_flushed");
    expect(tvProviderSource).toContain("pending_live_sync_rearmed");
    expect(tvProviderSource).toContain("pending_live_sync_cleared_after_sync");
    expect(tvProviderSource).toContain(
      "shouldRearmReadinessFlushOnPendingCreate"
    );
    expect(tvProviderSource).toContain("runReadinessFlush");
    expect(tvProviderSource).toContain("lastReadinessFlushGenerationRef");
    expect(tvProviderSource).toContain("decideReadinessFlush");
    // Ordinary syncToLive must not create durable pending intent.
    const syncToLiveBody = tvProviderSource.match(
      /const syncToLive = useCallback\(\(\): boolean => \{[\s\S]*?\}, \[/
    )?.[0];
    expect(syncToLiveBody).toBeTruthy();
    expect(syncToLiveBody!).not.toContain("pendingLiveSyncRef.current = true");
    expect(syncToLiveBody!).toContain("pending_live_sync_cleared_after_sync");
    expect(syncToLiveBody!).toContain("const finishHandled");
    expect(syncToLiveBody!).toMatch(
      /terminal_startup_failure[\s\S]*return false/
    );
    expect(syncToLiveBody!).not.toMatch(
      /terminal_startup_failure[\s\S]{0,120}finishHandled\(\)/
    );
  });

  it("readiness flush is single-shot per startupEmbedGeneration", () => {
    expect(tvProviderSource).toContain(
      "lastReadinessFlushGenerationRef.current = generation"
    );
    expect(tvProviderSource).toContain("decision.runPendingLive");
    expect(tvProviderSource).toContain(
      "decision.runOrdinaryMaybeSync && !didExplicitLiveSync"
    );
    expect(tvProviderSource).toContain("readinessFlushInFlightRef");
    expect(tvProviderSource).toContain(
      'runReadinessFlushRef.current("setPlayerVisible")'
    );
    expect(tvProviderSource).not.toContain(
      'maybeSyncToLive("setPlayerVisible")'
    );
    // Snapshot before decide so GLOBAL pending arms suppress ordinary maybeSync.
    const flushStart = tvProviderSource.indexOf(
      "const runReadinessFlush = useCallback"
    );
    const flushEnd = tvProviderSource.indexOf(
      "[flushPendingPlaybackRequest, maybeSyncToLive, syncToLive]",
      flushStart
    );
    expect(flushStart).toBeGreaterThan(-1);
    expect(flushEnd).toBeGreaterThan(flushStart);
    const flushBody = tvProviderSource.slice(flushStart, flushEnd);
    const snapIdx = flushBody.lastIndexOf(
      "applyTabPlaybackSnapshotRestoreRef.current(trigger)"
    );
    const decideIdx = flushBody.indexOf("decideReadinessFlush({");
    expect(snapIdx).toBeGreaterThan(-1);
    expect(decideIdx).toBeGreaterThan(snapIdx);
  });

  it("looper onReady does not double-flush pending playback beside setPlayerVisible", () => {
    const tvLooperSource = readFileSync(
      join(frontendRoot, "src/components/tv/tv-looper.tsx"),
      "utf8"
    );
    const onReady = tvLooperSource.match(
      /onReady=\{\(\) => \{[\s\S]*?\}\}/
    )?.[0];
    expect(onReady).toBeTruthy();
    expect(onReady!).toContain("onPlayerReady()");
    expect(onReady!).toContain("setPlayerVisible(true)");
    expect(onReady!).not.toContain("flushPendingPlaybackRequest()");
  });

  it("tab snapshot LOCAL restore is skipped when GLOBAL or pending live", () => {
    expect(tvProviderSource).toContain(
      "tab_snapshot_restore_skipped_global_intent"
    );
    expect(tvProviderSource).toMatch(
      /if \(\s*modeRef\.current === "GLOBAL" \|\|\s*pendingLiveSyncRef\.current\s*\)/
    );
  });

  it("GLOBAL tab snapshot arms pending without nested readiness flush", () => {
    expect(tvProviderSource).toContain(
      "tab_snapshot_restore_global_pending_sync"
    );
    const snapStart = tvProviderSource.indexOf(
      "const applyTabPlaybackSnapshotRestore = useCallback"
    );
    const snapEnd = tvProviderSource.indexOf(
      "[enterLocalMode, items, requestPlayback]",
      snapStart
    );
    expect(snapStart).toBeGreaterThan(-1);
    expect(snapEnd).toBeGreaterThan(snapStart);
    const snapFn = tvProviderSource.slice(snapStart, snapEnd);
    expect(snapFn).toContain("tab_snapshot_restore_global_pending_sync");
    expect(snapFn).not.toContain("runReadinessFlushRef.current");
    expect(tvProviderSource).toContain(
      'runReadinessFlushRef.current("items_loaded")'
    );
  });

  it("C0 debt apply at first PLAYING is mutually exclusive with pending flush", () => {
    expect(tvProviderSource).toContain("pending_live_debt_applied");
    const notify = tvProviderSource.match(
      /const notifyStartupPlayerPlaying = useCallback\(\(\) => \{[\s\S]*?\}, \[recordInitialEmbedSuccessOnce, tryCompleteGoLiveTransition\]\);/
    )?.[0];
    expect(notify).toBeTruthy();
    expect(notify!).toContain("pending_live_debt_applied");
    expect(notify!).not.toContain("pendingLiveSyncRef.current = false");
    expect(notify!).toContain("syncToLiveRef.current()");
    expect(notify!).not.toContain("runReadinessFlush");
  });

  it("enterLocalMode clears pending live sync", () => {
    expect(tvProviderSource).toContain("shouldClearPendingLiveSyncOnLocal");
    const enterLocal = tvProviderSource.match(
      /const enterLocalMode = useCallback\(\(reason: string, index\?: number\) => \{[\s\S]*?\}, \[\]\);/
    )?.[0];
    expect(enterLocal).toBeTruthy();
    expect(enterLocal!).toContain("pendingLiveSyncRef.current = false");
  });

  it("transport intent uses resolvePendingTransportIntent", () => {
    const controlsSource = readFileSync(
      join(frontendRoot, "src/hooks/use-tv-player-controls.ts"),
      "utf8"
    );
    expect(controlsSource).toContain("resolvePendingTransportIntent");
    expect(controlsSource).toContain("pendingTransportIntentRef");
    expect(controlsSource).not.toContain("pendingPlayRef");
  });

  it("GLOBAL playlist playing pin binds currentIndex from useTV", () => {
    const tableSource = readFileSync(
      join(frontendRoot, "src/components/tv/playlist-table.tsx"),
      "utf8"
    );
    // Must destructure currentIndex from useTV — a bare identifier is a false positive.
    const useTvDestructure = tableSource.match(
      /const\s*\{([\s\S]*?)\}\s*=\s*useTV\(\)/
    )?.[1];
    expect(useTvDestructure).toBeTruthy();
    expect(useTvDestructure!).toMatch(/\bcurrentIndex\b/);
    expect(tableSource).toMatch(
      /if \(mode === "GLOBAL"\) return rowIndex === currentIndex;/
    );
    expect(tableSource).not.toMatch(
      /if \(mode === "GLOBAL"\) return rowIndex === liveBroadcastIndex;/
    );
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

  it("explicit Go Live suppresses duplicate GLOBAL mode-effect initial sync", () => {
    expect(tvProviderSource).toContain("shouldSkipGlobalModeEffectInitialSync");
    const enterGlobal = tvProviderSource.match(
      /const enterGlobalMode = useCallback\(\(\) => \{[\s\S]*?\}, \[/
    )?.[0];
    expect(enterGlobal).toBeTruthy();
    expect(enterGlobal!).toContain("const handled = syncToLive()");
    expect(enterGlobal!).toMatch(
      /if \(handled\)[\s\S]*suppressNextGlobalModeEffectSyncRef\.current = true/
    );
    expect(flushRunPendingLiveBlock()).not.toContain(
      "pendingLiveSyncRef.current = false"
    );
  });

  it("setPlayerVisible stays stable and uses runReadinessFlushRef", () => {
    expect(tvProviderSource).toContain(
      "runReadinessFlushRef.current = runReadinessFlush"
    );
    const setVisible = tvProviderSource.match(
      /const setPlayerVisible = useCallback\(\(visible: boolean\) => \{[\s\S]*?\}, \[\]\);/
    )?.[0];
    expect(setVisible).toBeTruthy();
    expect(setVisible!).toContain(
      'runReadinessFlushRef.current("setPlayerVisible")'
    );
  });

  function flushRunPendingLiveBlock(): string {
    const flushStart = tvProviderSource.indexOf(
      "const runReadinessFlush = useCallback"
    );
    const pendingIdx = tvProviderSource.indexOf(
      "if (decision.runPendingLive)",
      flushStart
    );
    const endIdx = tvProviderSource.indexOf(
      "didExplicitLiveSync = true",
      pendingIdx
    );
    return tvProviderSource.slice(pendingIdx, endIdx + 30);
  }

  it("payment redirect snapshot arms session pause hold", () => {
    expect(tvProviderSource).toContain("snapshotPlaybackForPaymentRedirect");
    const redirect = tvProviderSource.match(
      /const snapshotPlaybackForPaymentRedirect = useCallback\(\(\) => \{[\s\S]*?\}, \[/
    )?.[0];
    expect(redirect).toBeTruthy();
    expect(redirect!).toContain("sessionPauseHeldRef.current = true");
    expect(redirect!).toContain("applyPaymentActiveFromHolds");
  });

  it("resumeAfterPayment restores GLOBAL via originMode + resolvePaymentRestoreMode", () => {
    expect(tvProviderSource).toContain("resolvePaymentRestoreMode");
    expect(tvProviderSource).toContain("tipPaymentSucceededRef");
    expect(tvProviderSource).toContain("markTvTipPaymentSucceeded");
    const resume = tvProviderSource.match(
      /const resumeAfterPayment = useCallback\(\(\) => \{[\s\S]*?\}, \[/
    )?.[0];
    expect(resume).toBeTruthy();
    expect(resume!).toContain("resolvePaymentRestoreMode");
    expect(resume!).toContain("enterGlobalMode");
    expect(resume!).toContain("applyPendingPaymentLocalRestore");
    expect(resume!).not.toMatch(
      /if \(originMode === "GLOBAL"\) \{\s*postPaymentAxisRef\.current = true;/
    );
  });

  it("transport clears on schedule source change; remount relies on TvPlayer epoch", () => {
    const controlsSource = readFileSync(
      join(frontendRoot, "src/hooks/use-tv-player-controls.ts"),
      "utf8"
    );
    expect(controlsSource).toContain(
      "shouldClearPendingTransportOnSourceChange"
    );
    expect(controlsSource).toContain("scheduleSourceCommunityId");
    const playerSource = readFileSync(
      join(frontendRoot, "src/components/tv/tv-player.tsx"),
      "utf8"
    );
    expect(playerSource).toContain("shouldAcceptTvPlayerYtCallback");
  });
});
