import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetTvStartupTraceForTest,
  getTvStartupSummaries,
  getTvStartupTraceId,
  hashShortId,
  isTvStartupTraceEnabled,
  markTvStartupNavigation,
  tvStartupEvent,
  updateTvStartupContext,
  type TvStartupSummary,
} from "../tv-startup-trace";

type FakeStorage = {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
};

function makeStorage(): FakeStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
}

let storage: FakeStorage;

type StartupHelper = {
  getLatest: () => TvStartupSummary | null;
  copyLatest: () => string;
};

type BrowserTestGlobals = {
  sessionStorage?: FakeStorage;
  window?: {
    location: { search: string };
    __TIPMANNA_TV_STARTUP_TRACE__?: StartupHelper;
  };
};

const testGlobal = globalThis as unknown as BrowserTestGlobals;

function installBrowserGlobals(search = "") {
  storage = makeStorage();
  testGlobal.sessionStorage = storage;
  testGlobal.window = { location: { search } };
}

function clearBrowserGlobals() {
  delete testGlobal.sessionStorage;
  delete testGlobal.window;
}

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;

beforeEach(() => {
  __resetTvStartupTraceForTest();
  installBrowserGlobals();
  delete process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  vi.restoreAllMocks();
});

afterEach(() => {
  __resetTvStartupTraceForTest();
  clearBrowserGlobals();
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = ORIGINAL_ENV;
  }
  vi.useRealTimers();
});

function enable() {
  process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
  __resetTvStartupTraceForTest();
  installBrowserGlobals();
}

function helper(): StartupHelper {
  const h = testGlobal.window?.__TIPMANNA_TV_STARTUP_TRACE__;
  if (!h) throw new Error("startup trace helper not installed");
  return h;
}

function finalizeStablePlaying() {
  updateTvStartupContext({ playerState: "PLAYING", overlayVisible: false });
  tvStartupEvent("player_playing", { canonicalMark: "T11" });
  vi.advanceTimersByTime(2000);
}

describe("enable / disable gating", () => {
  it("is disabled by default", () => {
    expect(isTvStartupTraceEnabled()).toBe(false);
    expect(getTvStartupTraceId()).toBeNull();
  });

  it("is enabled by env flag or ?tvDebug=1", () => {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
    __resetTvStartupTraceForTest();
    installBrowserGlobals();
    expect(isTvStartupTraceEnabled()).toBe(true);

    __resetTvStartupTraceForTest();
    installBrowserGlobals("?tvDebug=1");
    expect(isTvStartupTraceEnabled()).toBe(true);
  });
});

describe("finalized summary immutability", () => {
  it("freezes counters after stable_playback; getLatest and copyLatest match", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});

    finalizeStablePlaying();
    const viaGet = helper().getLatest();
    expect(viaGet?.finalState).toBe("stable");
    expect(viaGet?.scheduleNetworkAttemptCount).toBe(0);

    tvStartupEvent("schedule_request_started", { trigger: "interval" });
    tvStartupEvent("syncToLive");
    tvStartupEvent("syncToLive");

    const afterBg = helper().getLatest();
    const copied = JSON.parse(helper().copyLatest()) as TvStartupSummary;

    expect(afterBg?.scheduleNetworkAttemptCount).toBe(0);
    expect(copied.scheduleNetworkAttemptCount).toBe(0);
    expect(copied.syncToLiveCount).toBe(0);
    expect(JSON.stringify(afterBg)).toBe(JSON.stringify(copied));
    expect(copied.finalizedAt).not.toBeNull();
    expect(copied.postFinalizationEventCount).toBeGreaterThan(0);
  });

  it("does not mutate persisted sessionStorage summary after finalize", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("schedule_request_started", { trigger: "initial" });
    finalizeStablePlaying();

    const persisted = getTvStartupSummaries()[0];
    expect(persisted.scheduleNetworkAttemptCount).toBe(1);

    tvStartupEvent("schedule_request_started", { trigger: "interval" });
    tvStartupEvent("schedule_request_started", { trigger: "interval" });

    expect(getTvStartupSummaries()[0].scheduleNetworkAttemptCount).toBe(1);
  });
});

describe("stable playback guards", () => {
  it("does not emit stable_playback while BUFFERING at window end", () => {
    enable();
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    updateTvStartupContext({ playerState: "PLAYING" });
    tvStartupEvent("player_playing", { canonicalMark: "T11" });
    updateTvStartupContext({ playerState: "BUFFERING", overlayVisible: true });
    vi.advanceTimersByTime(2000);

    expect(getTvStartupSummaries().length).toBe(0);
    const interrupted = spy.mock.calls.some(
      c =>
        typeof c[0] === "string" &&
        c[0].includes("stability_interrupted") &&
        (c[1] as { reason?: string })?.reason === "not_playing_at_window_end"
    );
    expect(interrupted).toBe(true);
  });

  it("interrupts stability on BUFFERING during the window and waits for PLAYING", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});

    updateTvStartupContext({ playerState: "PLAYING", overlayVisible: false });
    tvStartupEvent("player_playing", { canonicalMark: "T11" });
    vi.advanceTimersByTime(500);
    updateTvStartupContext({ playerState: "BUFFERING" });
    tvStartupEvent("player_buffering", { canonicalMark: "T10" });
    vi.advanceTimersByTime(2000);
    expect(getTvStartupSummaries().length).toBe(0);

    updateTvStartupContext({ playerState: "PLAYING" });
    tvStartupEvent("player_playing");
    vi.advanceTimersByTime(2000);
    expect(getTvStartupSummaries()[0]?.finalState).toBe("stable");
  });

  it("interrupts on load, seek, index change, source reset and error", () => {
    enable();
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    const interruptEvents = [
      "orchestrated_playback_command_issued",
      "setCurrentIndex",
      "source_reset",
      "player_error",
    ] as const;

    for (const evt of interruptEvents) {
      __resetTvStartupTraceForTest();
      process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
      installBrowserGlobals();
      vi.useFakeTimers();
      spy.mockClear();

      updateTvStartupContext({ playerState: "PLAYING" });
      tvStartupEvent("player_playing", { canonicalMark: "T11" });
      vi.advanceTimersByTime(500);
      if (evt === "orchestrated_playback_command_issued") {
        tvStartupEvent(evt, { data: { command: "seekTo" } });
      } else {
        tvStartupEvent(evt);
      }
      vi.advanceTimersByTime(2000);
      expect(getTvStartupSummaries().length).toBe(0);
      expect(
        spy.mock.calls.some(
          c =>
            typeof c[0] === "string" &&
            c[0].includes("stability_interrupted") &&
            (c[1] as { reason?: string })?.reason === evt
        )
      ).toBe(true);
    }
  });
});

describe("canonical T9 semantics", () => {
  it("does not assign T9 to initial_embed_created", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("player_ready", { canonicalMark: "T8" });
    tvStartupEvent("initial_embed_created", { trigger: "initial_embed" });

    const s = helper().getLatest();
    expect(s?.marks.T9).toBeUndefined();
    expect(s?.initialEmbedCount).toBe(1);
    expect(s?.loadVideoByIdCount).toBe(0);
  });

  it("assigns T9 only to the first orchestrated command after T8", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("player_ready", { canonicalMark: "T8" });
    tvStartupEvent("orchestrated_playback_command_issued", {
      data: { command: "loadVideoById" },
    });
    const firstT9 = helper().getLatest()?.marks.T9;
    tvStartupEvent("orchestrated_playback_command_issued", {
      data: { command: "seekTo" },
    });
    expect(helper().getLatest()?.marks.T9).toBe(firstT9);
    expect(helper().getLatest()?.segments.T8_T9).not.toBeNull();
    expect(helper().getLatest()?.segments.T8_T9 ?? -1).toBeGreaterThanOrEqual(
      0
    );
  });
});

describe("overlay timing", () => {
  it("reports overlay removed before playing without negative T11_T12 segment", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});

    let fakeNow = 0;
    vi.spyOn(performance, "now").mockImplementation(() => fakeNow);

    fakeNow = 1000;
    tvStartupEvent("player_overlay_removed", { canonicalMark: "T12" });
    fakeNow = 5000;
    tvStartupEvent("player_playing", { canonicalMark: "T11" });

    updateTvStartupContext({ playerState: "PLAYING", overlayVisible: false });
    fakeNow = 5100;
    tvStartupEvent("player_playing");
    fakeNow = 7100;
    vi.advanceTimersByTime(2000);

    const summary = getTvStartupSummaries()[0];
    expect(summary.overlayRemovedBeforePlaying).toBe(true);
    expect(summary.overlayLeadMs).toBe(4000);
    expect(summary.overlayLagMs).toBeNull();
    expect(summary.segments.T11_T12).toBeNull();
    expect(summary.segmentDiagnostics).toContain("reordered_T11_after_T12");
    expect(summary.totalTtfvMs).toBe(5000);
  });
});

describe("playback and schedule counters", () => {
  it("counts orchestrated commands separately without double-counting seeks", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("initial_embed_created");
    tvStartupEvent("orchestrated_playback_command_issued", {
      data: { command: "loadVideoById" },
    });
    tvStartupEvent("orchestrated_playback_command_issued", {
      data: { command: "seekTo" },
    });
    tvStartupEvent("orchestrated_playback_command_issued", {
      data: { command: "playVideo" },
    });

    const s = helper().getLatest();
    expect(s?.initialEmbedCount).toBe(1);
    expect(s?.loadVideoByIdCount).toBe(1);
    expect(s?.seekToCount).toBe(1);
    expect(s?.playVideoCount).toBe(1);
    expect(s?.totalPlaybackCommandCount).toBe(3);
    expect(s?.playerLoadCommandCount).toBe(1);
  });

  it("separates network attempts, cache bootstrap and refresh triggers", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("session_cache_bootstrap", { trigger: "initial" });
    tvStartupEvent("schedule_request_started", { trigger: "initial" });
    tvStartupEvent("schedule_request_started", { trigger: "retry" });
    tvStartupEvent("schedule_request_started", { trigger: "visibility" });
    tvStartupEvent("schedule_request_started", { trigger: "interval" });

    const s = helper().getLatest();
    expect(s?.scheduleCacheBootstrapCount).toBe(1);
    expect(s?.scheduleNetworkAttemptCount).toBe(4);
    expect(s?.scheduleAttemptCount).toBe(4);
    expect(s?.scheduleRetryCount).toBe(1);
    expect(s?.scheduleRefreshCountDuringStartup).toBe(2);
    expect(s?.marks.T3).not.toBeUndefined();
  });

  it("records schedule attempt ids and initial trigger on network starts", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("schedule_request_started", {
      trigger: "initial",
      data: { scheduleAttemptId: "attempt-1", attemptNumber: 1 },
    });
    tvStartupEvent("schedule_request_started", {
      trigger: "interval",
      data: { scheduleAttemptId: "attempt-2", attemptNumber: 2 },
    });

    const s = helper().getLatest();
    expect(s?.initialScheduleAttemptId).toBe("attempt-1");
    expect(s?.initialScheduleTrigger).toBe("initial");
    expect(s?.scheduleAttemptIds).toEqual(["attempt-1", "attempt-2"]);
    expect(s?.scheduleNetworkAttemptCount).toBe(2);
  });

  it("does not record attempt ids for session cache bootstrap", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("session_cache_bootstrap", { trigger: "initial" });

    const s = helper().getLatest();
    expect(s?.scheduleCacheBootstrapCount).toBe(1);
    expect(s?.scheduleNetworkAttemptCount).toBe(0);
    expect(s?.scheduleAttemptIds).toEqual([]);
    expect(s?.initialScheduleAttemptId).toBeNull();
  });

  it("records Phase C0 guard counters and youtube error codes", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("player_error", {
      data: { youtubeErrorCode: 101, videoIdHash: "h1" },
    });
    tvStartupEvent("player_error", {
      data: { youtubeErrorCode: 101, videoIdHash: "h2" },
    });
    tvStartupEvent("pre_play_drift_seek_suppressed", { trigger: "sync" });
    tvStartupEvent("duplicate_pre_play_load_suppressed", { trigger: "sync" });
    tvStartupEvent("startup_error_recovery_started", { trigger: "permanent" });
    tvStartupEvent("startup_error_target_skipped", { trigger: "skip" });
    tvStartupEvent("startup_recovery_cap_reached", { reason: "cap" });

    const s = helper().getLatest();
    expect(s?.youtubeErrorCodeCounts).toEqual({ "101": 2 });
    expect(s?.prePlaySeekSuppressedCount).toBe(1);
    expect(s?.duplicateLoadSuppressedCount).toBe(1);
    expect(s?.startupRecoveryCount).toBe(1);
    expect(s?.failedStartupTargetCount).toBe(1);
    expect(s?.startupRecoveryCapReached).toBe(true);
    expect(s?.playerErrorCount).toBe(2);
  });

  it("records Phase C1 embed summary fields and T9 at confirm", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("player_ready", { canonicalMark: "T8" });
    tvStartupEvent("initial_embed_created", {
      data: {
        startOffsetSeconds: 120,
        targetWasResolved: true,
        startupGeneration: 1,
      },
    });
    tvStartupEvent("initial_live_offset_embed_confirmed", {
      data: {
        startOffsetSeconds: 120,
        targetWasResolved: true,
        startupGeneration: 1,
      },
    });
    tvStartupEvent("initial_reload_avoided", { trigger: "syncToLive" });

    const s = helper().getLatest();
    expect(s?.marks.T9).not.toBeUndefined();
    expect(s?.initialEmbedStartOffsetSeconds).toBe(120);
    expect(s?.initialEmbedUsedResolvedTarget).toBe(true);
    expect(s?.initialReloadAvoided).toBe(true);
    expect(s?.segments.T8_T9).not.toBeNull();
    expect(s?.segments.T8_T9 ?? -1).toBeGreaterThanOrEqual(0);
  });

  it("records C1.1 confirmed fields and sync trigger separately from matched-first-sync", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("initial_embed_target_confirmed", {
      trigger: "first_playing_fallback",
      data: {
        trigger: "first_playing_fallback",
        startupGeneration: 1,
        source: "global",
        currentIndex: 0,
        expectedOffsetSeconds: 104,
        currentLiveOffsetSeconds: 104,
        driftSeconds: 0,
      },
    });
    tvStartupEvent("initial_reload_avoided", {
      trigger: "first_playing_fallback",
    });

    const s = helper().getLatest();
    expect(s?.initialEmbedTargetConfirmed).toBe(true);
    expect(s?.initialEmbedSuccessTrigger).toBe("first_playing_fallback");
    expect(s?.initialReloadAvoided).toBe(true);
    expect(s?.initialEmbedTargetMatchedFirstSync).toBe(false);
  });

  it("sets matched-first-sync only for sync-based confirmation events", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("initial_embed_target_confirmed", {
      data: { trigger: "first_sync_same_index" },
    });
    tvStartupEvent("initial_embed_target_matched_first_sync", {
      trigger: "first_sync_same_index",
    });
    tvStartupEvent("initial_reload_avoided", {
      trigger: "first_sync_same_index",
    });

    const s = helper().getLatest();
    expect(s?.initialEmbedTargetConfirmed).toBe(true);
    expect(s?.initialEmbedSuccessTrigger).toBe("first_sync_same_index");
    expect(s?.initialEmbedTargetMatchedFirstSync).toBe(true);
    expect(s?.initialReloadAvoided).toBe(true);
  });

  it("records scheduleRequestTriggers and scheduleAttemptTriggerById", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("schedule_request_started", {
      trigger: "initial",
      data: { scheduleAttemptId: "attempt-1" },
    });
    tvStartupEvent("schedule_request_started", {
      trigger: "pusher",
      data: { scheduleAttemptId: "attempt-2" },
    });

    const s = helper().getLatest();
    expect(s?.scheduleRequestTriggers).toEqual(["initial", "pusher"]);
    expect(s?.scheduleAttemptTriggerById).toEqual({
      "attempt-1": "initial",
      "attempt-2": "pusher",
    });
  });

  it("computes firstBufferingRelativeToPlaying diagnostic", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("player_playing", { canonicalMark: "T11" });
    tvStartupEvent("player_buffering", { canonicalMark: "T10" });

    const s = helper().getLatest();
    expect(s?.firstBufferingRelativeToPlaying).toBe("after");
    expect(s?.segmentDiagnostics).toContain("reordered_T10_after_T11");
  });

  it("records C0.1 stability guard summary fields", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("startup_stability_guard_activated", {
      trigger: "player_playing",
    });
    tvStartupEvent("post_first_play_pre_stable_error", {
      data: { youtubeErrorCode: 150 },
    });
    tvStartupEvent("pre_stable_drift_seek_suppressed", {
      trigger: "syncToLive_drift_seek",
    });
    tvStartupEvent("pre_stable_corrective_seek_issued", {
      trigger: "syncToLive_drift_seek",
    });
    tvStartupEvent("startup_stability_guard_released", {
      data: { releaseReason: "stable_playback" },
    });

    const s = helper().getLatest();
    expect(s?.postFirstPlayPreStableErrorCount).toBe(1);
    expect(s?.preStableSeekSuppressedCount).toBe(1);
    expect(s?.preStableCorrectiveSeekCount).toBe(1);
    expect(s?.startupStabilityGuardReleased).toBe(true);
    expect(s?.startupStabilityGuardReleaseReason).toBe("stable_playback");
  });
});

describe("segment safety", () => {
  it("leaves unavailable segments null instead of negative values", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("player_ready", { canonicalMark: "T8" });
    tvStartupEvent("initial_embed_created");

    const s = helper().getLatest();
    expect(s?.segments.T8_T9).toBeNull();
    for (const val of Object.values(s?.segments ?? {})) {
      if (val != null) expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("separate navigations", () => {
  it("starts a fresh trace after a finalized run", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});

    finalizeStablePlaying();
    const firstId = helper().getLatest()?.traceId;

    markTvStartupNavigation();
    tvStartupEvent("tv_provider_mounted", { canonicalMark: "T2" });

    const secondId = getTvStartupTraceId();
    expect(secondId).not.toBe(firstId);
    expect(helper().getLatest()?.finalState).toBe("pending");
    expect(helper().getLatest()?.marks.T2).not.toBeUndefined();
  });
});

describe("privacy / resilience", () => {
  it("hashShortId does not echo raw values", () => {
    const hashed = hashShortId("dQw4w9WgXcQ");
    expect(hashed).not.toBe("dQw4w9WgXcQ");
    expect(hashShortId(null)).toBeNull();
  });

  it("never throws when sessionStorage.setItem fails", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(() => {
      finalizeStablePlaying();
    }).not.toThrow();
  });
});
