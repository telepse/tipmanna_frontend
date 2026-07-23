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
} from "../tv-startup-trace";

const SESSION_KEY = "tipmanna-tv-startup-traces-v1";

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

type StartupSummaryShape = {
  marks: Record<string, number>;
  scheduleAttemptCount: number;
  scheduleRetryCount: number;
  playerLoadCommandCount: number;
  seekCount: number;
  playCommandCount: number;
  syncToLiveCount: number;
  currentIndexChangeCount: number;
  playerErrorCount: number;
  retry10sOccurred: boolean;
  retry30sOccurred: boolean;
  retry60sOccurred: boolean;
};

type StartupHelper = { getLatest: () => StartupSummaryShape };

type BrowserTestGlobals = {
  sessionStorage?: FakeStorage;
  window?: {
    location: { search: string };
    __TIPMANNA_TV_STARTUP_TRACE__?: StartupHelper;
  };
  __TIPMANNA_TV_STARTUP_TRACE__?: StartupHelper;
};

const testGlobal = globalThis as unknown as BrowserTestGlobals;

function installBrowserGlobals(search = "") {
  storage = makeStorage();
  testGlobal.sessionStorage = storage;
  testGlobal.window = {
    location: { search },
  };
}

function clearBrowserGlobals() {
  delete testGlobal.sessionStorage;
  delete testGlobal.window;
  delete testGlobal.__TIPMANNA_TV_STARTUP_TRACE__;
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

describe("enable / disable gating", () => {
  it("is disabled by default (no flag, no query)", () => {
    expect(isTvStartupTraceEnabled()).toBe(false);
    expect(getTvStartupTraceId()).toBeNull();

    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("tv_provider_mounted", { canonicalMark: "T2" });
    expect(spy).not.toHaveBeenCalled();
    expect(storage.store.has(SESSION_KEY)).toBe(false);
  });

  it("is enabled by the environment flag (1 or true)", () => {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
    __resetTvStartupTraceForTest();
    installBrowserGlobals();
    expect(isTvStartupTraceEnabled()).toBe(true);
    expect(getTvStartupTraceId()).not.toBeNull();

    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "true";
    __resetTvStartupTraceForTest();
    installBrowserGlobals();
    expect(isTvStartupTraceEnabled()).toBe(true);
  });

  it("is enabled by ?tvDebug=1", () => {
    __resetTvStartupTraceForTest();
    installBrowserGlobals("?tvDebug=1");
    expect(isTvStartupTraceEnabled()).toBe(true);
  });

  it("treats other flag values as disabled", () => {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "yes";
    __resetTvStartupTraceForTest();
    installBrowserGlobals();
    expect(isTvStartupTraceEnabled()).toBe(false);
  });
});

function enable() {
  process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
  __resetTvStartupTraceForTest();
  installBrowserGlobals();
}

/** In node the browser helper is installed on `window`, not on `globalThis`. */
function helper(): StartupHelper {
  const h = testGlobal.window?.__TIPMANNA_TV_STARTUP_TRACE__;
  if (!h) throw new Error("startup trace helper not installed");
  return h;
}

describe("event ordering and marks", () => {
  it("records canonical marks in emitted order", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    markTvStartupNavigation();
    tvStartupEvent("tv_provider_mounted", { canonicalMark: "T2" });
    tvStartupEvent("schedule_request_started", {
      canonicalMark: "T3",
      trigger: "initial",
    });
    tvStartupEvent("schedule_payload_accepted", {
      canonicalMark: "T4",
      data: { source: "network" },
    });
    tvStartupEvent("playlist_selected", { canonicalMark: "T5" });

    const latest = helper().getLatest();
    const keys = Object.keys(latest.marks);
    // T0 is recorded by navigation; T2..T5 follow in order.
    expect(keys).toEqual(["T0", "T2", "T3", "T4", "T5"]);
  });

  it("emits a canonical mark only once even if event repeats", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("schedule_request_started", {
      canonicalMark: "T3",
      trigger: "initial",
    });
    const firstT3 = helper().getLatest().marks.T3;
    tvStartupEvent("schedule_request_started", {
      canonicalMark: "T3",
      trigger: "retry",
    });
    expect(helper().getLatest().marks.T3).toBe(firstT3);
  });
});

describe("repeated-action counters", () => {
  it("counts schedule attempts and retries with triggers", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("schedule_request_started", { trigger: "initial" });
    tvStartupEvent("schedule_request_started", { trigger: "retry" });
    tvStartupEvent("schedule_request_started", { trigger: "retry" });
    const s = helper().getLatest();
    expect(s.scheduleAttemptCount).toBe(3);
    expect(s.scheduleRetryCount).toBe(2);
  });

  it("counts load / seek / play / sync / index / error separately", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("playback_command_issued", {
      data: { command: "loadVideoById" },
    });
    tvStartupEvent("playback_command_issued", { data: { command: "seekTo" } });
    tvStartupEvent("playback_command_issued", {
      data: { command: "playVideo" },
    });
    tvStartupEvent("syncToLive");
    tvStartupEvent("syncToLive");
    tvStartupEvent("setCurrentIndex", { data: { currentIndex: 3 } });
    tvStartupEvent("player_error");
    const s = helper().getLatest();
    expect(s.playerLoadCommandCount).toBe(1);
    expect(s.seekCount).toBe(1);
    expect(s.playCommandCount).toBe(1);
    expect(s.syncToLiveCount).toBe(2);
    expect(s.currentIndexChangeCount).toBe(1);
    expect(s.playerErrorCount).toBe(1);
  });

  it("flags which retry delay occurred", () => {
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    tvStartupEvent("schedule_request_finished", {
      data: { retryDelayMs: 60_000 },
    });
    const s = helper().getLatest();
    expect(s.retry60sOccurred).toBe(true);
    expect(s.retry10sOccurred).toBe(false);
    expect(s.retry30sOccurred).toBe(false);
  });
});

describe("stability + summary", () => {
  it("finalizes as stable after a 2s uninterrupted window and computes segments", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("tv_provider_mounted", { canonicalMark: "T2" });
    tvStartupEvent("player_playing", { canonicalMark: "T11" });
    tvStartupEvent("player_overlay_removed", { canonicalMark: "T12" });

    vi.advanceTimersByTime(2000);

    const all = getTvStartupSummaries();
    expect(all.length).toBe(1);
    const summary = all[0];
    expect(summary.finalState).toBe("stable");
    expect(summary.marks.T13).not.toBeUndefined();
    // segment for adjacent present marks (T11 -> T12) exists
    expect(summary.segments).toHaveProperty("T11_T12");
    expect(summary.totalTtfvMs).not.toBeNull();
    expect(summary.stableTtfvMs).not.toBeNull();
  });

  it("restarts the window when interrupted and emits stability_interrupted", () => {
    enable();
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    tvStartupEvent("player_playing", { canonicalMark: "T11" });
    vi.advanceTimersByTime(1000);
    // interrupt before 2s
    tvStartupEvent("setCurrentIndex", { data: { currentIndex: 5 } });
    vi.advanceTimersByTime(1000);
    // Not yet stable (window restarted at interrupt).
    expect(getTvStartupSummaries().length).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(getTvStartupSummaries().length).toBe(1);

    const interruptCall = spy.mock.calls.find(
      c => typeof c[0] === "string" && c[0].includes("stability_interrupted")
    );
    expect(interruptCall).toBeTruthy();
  });

  it("handles missing marks safely (partial timeline)", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    // Only T2, then failure timeout (no playing).
    tvStartupEvent("tv_provider_mounted", { canonicalMark: "T2" });
    vi.advanceTimersByTime(90_000);
    const all = getTvStartupSummaries();
    expect(all.length).toBe(1);
    expect(all[0].finalState).toBe("failed");
    expect(all[0].totalTtfvMs).toBeNull();
    expect(all[0].stableTtfvMs).toBeNull();
  });
});

describe("privacy / safety", () => {
  it("hashShortId does not echo the raw value and is short", () => {
    const raw = "dQw4w9WgXcQ";
    const hashed = hashShortId(raw);
    expect(hashed).not.toBe(raw);
    expect(hashed?.startsWith("#")).toBe(true);
    expect((hashed ?? "").length).toBeLessThanOrEqual(9);
    expect(hashShortId(null)).toBeNull();
    expect(hashShortId("")).toBeNull();
  });

  it("emitted records never contain token/cookie/authorization keys", () => {
    enable();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    updateTvStartupContext({ source: "global", currentIndex: 2 });
    tvStartupEvent("schedule_payload_accepted", {
      canonicalMark: "T4",
      data: { source: "network", activeScheduleIdHash: hashShortId("abc123") },
    });
    for (const call of spy.mock.calls) {
      const payload = call[1] as Record<string, unknown> | undefined;
      if (!payload) continue;
      const keys = Object.keys(payload).map(k => k.toLowerCase());
      for (const forbidden of [
        "token",
        "cookie",
        "authorization",
        "password",
      ]) {
        expect(keys.some(k => k.includes(forbidden))).toBe(false);
      }
      const serialized = JSON.stringify(payload).toLowerCase();
      expect(serialized.includes("bearer ")).toBe(false);
    }
  });
});

describe("bounded history + resilience", () => {
  it("caps sessionStorage history at 25 runs", () => {
    // Install storage ONCE; reset only trace state between runs so the same
    // sessionStorage accumulates summaries.
    enable();
    vi.spyOn(console, "info").mockImplementation(() => {});
    for (let i = 0; i < 27; i += 1) {
      __resetTvStartupTraceForTest();
      process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
      vi.useFakeTimers();
      tvStartupEvent("player_playing", { canonicalMark: "T11" });
      vi.advanceTimersByTime(2000);
      vi.useRealTimers();
    }
    const all = getTvStartupSummaries();
    expect(all.length).toBe(25);
  });

  it("never throws when sessionStorage.setItem fails", () => {
    enable();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(() => {
      tvStartupEvent("player_playing", { canonicalMark: "T11" });
      vi.advanceTimersByTime(2000);
    }).not.toThrow();
  });
});
