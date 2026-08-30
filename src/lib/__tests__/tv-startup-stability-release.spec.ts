import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetTvStartupTraceForTest,
  getTvStartupSummaries,
  releaseStartupStabilityGuardOnce,
  setTvStartupStabilityGuardReleaseCallback,
  tvStartupEvent,
  tvStartupFinalizeFailed,
  updateTvStartupContext,
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

type BrowserTestGlobals = {
  sessionStorage?: FakeStorage;
  window?: {
    location: { search: string };
    __TIPMANNA_TV_STARTUP_TRACE__?: {
      getLatest: () => ReturnType<typeof getTvStartupSummaries>[0];
    };
  };
};

const testGlobal = globalThis as unknown as BrowserTestGlobals;

const ORIGINAL_TRACE = process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
const ORIGINAL_C0 = process.env.NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD;
const ORIGINAL_C01 = process.env.NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD;

function installBrowserGlobals() {
  testGlobal.sessionStorage = makeStorage();
  testGlobal.window = { location: { search: "" } };
}

function enableTrace() {
  process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
  __resetTvStartupTraceForTest();
  installBrowserGlobals();
}

function enableStabilityGuard() {
  process.env.NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD = "1";
  process.env.NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD = "1";
}

function finalizeStablePlaying() {
  updateTvStartupContext({ playerState: "PLAYING", overlayVisible: false });
  tvStartupEvent("player_playing", { canonicalMark: "T11" });
  vi.advanceTimersByTime(2000);
}

function eventNamesFromSpy(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls
    .filter(
      c => typeof c[0] === "string" && c[0].includes("[TV_STARTUP_TRACE]")
    )
    .map(c => {
      const raw = c[0] as string;
      const parts = raw.split(" ");
      return parts[parts.length - 1] ?? raw;
    });
}

beforeEach(() => {
  __resetTvStartupTraceForTest();
  installBrowserGlobals();
  delete process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  delete process.env.NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD;
  delete process.env.NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD;
  vi.restoreAllMocks();
});

afterEach(() => {
  __resetTvStartupTraceForTest();
  delete testGlobal.sessionStorage;
  delete testGlobal.window;
  if (ORIGINAL_TRACE === undefined) {
    delete process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = ORIGINAL_TRACE;
  }
  if (ORIGINAL_C0 === undefined) {
    delete process.env.NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD;
  } else {
    process.env.NEXT_PUBLIC_TV_STARTUP_PLAYBACK_GUARD = ORIGINAL_C0;
  }
  if (ORIGINAL_C01 === undefined) {
    delete process.env.NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD;
  } else {
    process.env.NEXT_PUBLIC_TV_STARTUP_STABILITY_GUARD = ORIGINAL_C01;
  }
  vi.useRealTimers();
});

describe("Phase C0.1a stability release lifecycle", () => {
  it("releases before T13 and finalization on stable path", () => {
    enableStabilityGuard();
    enableTrace();
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const releases: string[] = [];
    setTvStartupStabilityGuardReleaseCallback(({ reason }) => {
      releases.push(reason);
    });

    finalizeStablePlaying();

    const s = getTvStartupSummaries()[0];
    expect(s?.finalState).toBe("stable");
    expect(s?.startupStabilityGuardReleased).toBe(true);
    expect(s?.startupStabilityGuardReleaseReason).toBe("stable_playback");
    expect(s?.startupStabilityGuardReleasedAtMs).not.toBeNull();
    expect(s?.marks.T13).not.toBeUndefined();
    expect(releases).toEqual(["stable_playback"]);
    expect(s?.segmentDiagnostics).not.toContain(
      "stability_release_missing_before_finalization"
    );

    const names = eventNamesFromSpy(spy);
    const releaseIdx = names.indexOf("startup_stability_guard_released");
    const stableIdx = names.indexOf("stable_playback");
    const summaryIdx = names.indexOf("summary");
    expect(releaseIdx).toBeGreaterThanOrEqual(0);
    expect(stableIdx).toBeGreaterThan(releaseIdx);
    expect(summaryIdx).toBeGreaterThan(stableIdx);
  });

  it("never finalizes with released=false and reason set", () => {
    enableStabilityGuard();
    enableTrace();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    setTvStartupStabilityGuardReleaseCallback(() => {});

    finalizeStablePlaying();

    const s = getTvStartupSummaries()[0];
    expect(s?.startupStabilityGuardReleased).toBe(true);
    expect(s?.startupStabilityGuardReleaseReason).toBe("stable_playback");
    if (s && !s.startupStabilityGuardReleased) {
      expect(s.startupStabilityGuardReleaseReason).toBeNull();
    }
  });

  it("emits release only once on duplicate stable notifications", () => {
    enableTrace();
    vi.useFakeTimers();
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    updateTvStartupContext({ playerState: "PLAYING" });
    tvStartupEvent("player_playing", { canonicalMark: "T11" });

    expect(
      releaseStartupStabilityGuardOnce({ reason: "stable_playback" })
    ).toBe(true);
    expect(
      releaseStartupStabilityGuardOnce({ reason: "stable_playback" })
    ).toBe(false);

    vi.advanceTimersByTime(2000);

    const releaseCount = spy.mock.calls.filter(
      c =>
        typeof c[0] === "string" &&
        c[0].includes("startup_stability_guard_released")
    ).length;
    expect(releaseCount).toBe(1);
    expect(getTvStartupSummaries()[0]?.finalState).toBe("stable");
  });

  it("terminal failure releases before failed finalization", () => {
    enableStabilityGuard();
    enableTrace();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const releases: string[] = [];
    setTvStartupStabilityGuardReleaseCallback(
      ({ reason }) => {
        releases.push(reason);
      },
      () => 1
    );

    tvStartupEvent("player_playing", { canonicalMark: "T11" });
    tvStartupEvent("startup_terminal_failure", {
      reason: "startup_recovery_cap_reached",
    });
    expect(
      releaseStartupStabilityGuardOnce({
        reason: "terminal_failure",
        startupGeneration: 1,
      })
    ).toBe(true);
    tvStartupFinalizeFailed("startup_recovery_cap_reached");

    const s = getTvStartupSummaries()[0];
    expect(s?.finalState).toBe("failed");
    expect(s?.startupStabilityGuardReleased).toBe(true);
    expect(s?.startupStabilityGuardReleaseReason).toBe("terminal_failure");
    expect(releases).toEqual(["terminal_failure"]);
  });

  it("ignores stale-generation release callbacks", () => {
    enableTrace();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const releases: string[] = [];
    setTvStartupStabilityGuardReleaseCallback(
      ({ reason }) => {
        releases.push(reason);
      },
      () => 2
    );

    expect(
      releaseStartupStabilityGuardOnce({
        reason: "terminal_failure",
        startupGeneration: 1,
      })
    ).toBe(false);
    expect(releases).toEqual([]);

    const s = getTvStartupSummaries();
    expect(s.length).toBe(0);
  });

  it("keeps finalized release fields immutable after runtime events", () => {
    enableStabilityGuard();
    enableTrace();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    setTvStartupStabilityGuardReleaseCallback(() => {});

    finalizeStablePlaying();
    const helper = testGlobal.window?.__TIPMANNA_TV_STARTUP_TRACE__ as
      | { getLatest: () => ReturnType<typeof getTvStartupSummaries>[0] }
      | undefined;
    const frozen = helper?.getLatest() ?? getTvStartupSummaries()[0];
    expect(frozen?.startupStabilityGuardReleased).toBe(true);

    tvStartupEvent("syncToLive");
    tvStartupEvent("player_buffering");
    tvStartupEvent("startup_stability_guard_released", {
      data: { releaseReason: "stable_playback" },
    });

    const after = helper?.getLatest() ?? getTvStartupSummaries()[0];
    expect(after?.startupStabilityGuardReleased).toBe(true);
    expect(after?.startupStabilityGuardReleaseReason).toBe("stable_playback");
    expect(after?.startupStabilityGuardReleasedAtMs).toBe(
      frozen?.startupStabilityGuardReleasedAtMs
    );
    expect(after?.postFinalizationEventCount ?? 0).toBeGreaterThan(0);
  });

  it("does not require release when stability guard flag is off", () => {
    enableTrace();
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});

    finalizeStablePlaying();

    const s = getTvStartupSummaries()[0];
    expect(s?.finalState).toBe("stable");
    expect(s?.startupStabilityGuardReleased).toBe(false);
    expect(s?.startupStabilityGuardReleaseReason).toBeNull();
    expect(s?.segmentDiagnostics).not.toContain(
      "stability_release_missing_before_finalization"
    );
  });
});
