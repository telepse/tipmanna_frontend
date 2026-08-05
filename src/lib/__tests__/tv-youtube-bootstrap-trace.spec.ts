import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __getYoutubeBootstrapStateForTest,
  __ingestResourceEntryForTest,
  __recordLongTaskForTest,
  __resetYoutubeBootstrapCacheForTest,
  applyYoutubeBootstrapToSummary,
  attachIframeInsertionObserver,
  buildYoutubeBootstrapSummaryFields,
  computeBootstrapDiagnostics,
  initYoutubeBootstrapTrace,
  isTvYoutubeBootstrapTraceActive,
  isTvYoutubeBootstrapTraceEnabled,
  notifyBootstrapT6,
  notifyBootstrapT8,
  recordApiObjectDetected,
  recordLooperCommitted,
  recordPlayerCommitted,
  recordPlayerRenderRequested,
  resetYoutubeBootstrapTrace,
} from "../tv-youtube-bootstrap-trace";

const ORIGINAL_TRACE = process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
const ORIGINAL_BOOTSTRAP = process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE;

type BrowserGlobals = {
  window?: Window & { YT?: { Player?: unknown } };
  MutationObserver?: typeof MutationObserver;
};

const testGlobal = globalThis as unknown as BrowserGlobals;

let mutationObserverCallback: MutationCallback | null = null;

function installDomMocks() {
  class MockMutationObserver {
    constructor(cb: MutationCallback) {
      mutationObserverCallback = cb;
    }
    observe() {}
    disconnect() {
      mutationObserverCallback = null;
    }
  }
  testGlobal.MutationObserver =
    MockMutationObserver as unknown as typeof MutationObserver;
  testGlobal.window =
    testGlobal.window ?? ({} as Window & { YT?: { Player?: unknown } });
  (globalThis as { window?: unknown }).window = testGlobal.window;
}

function makePlayerContainer() {
  const iframes: Element[] = [];
  return {
    querySelectorAll: (sel: string) => (sel === "iframe" ? iframes : []),
    appendChild(node: Element) {
      iframes.push(node);
      mutationObserverCallback?.(
        [{ addedNodes: [node] } as unknown as MutationRecord],
        this as unknown as MutationObserver
      );
      return node;
    },
  } as unknown as Element;
}

function makeIframeElement(src?: string) {
  return {
    tagName: "IFRAME",
    src: src ?? "",
  } as unknown as HTMLIFrameElement;
}

function fakeResource(
  overrides: Partial<PerformanceResourceTiming> & { name: string }
): PerformanceResourceTiming {
  const startTime = overrides.startTime ?? 0;
  const responseEnd = overrides.responseEnd ?? 0;
  return {
    entryType: "resource",
    name: overrides.name,
    startTime,
    responseStart: overrides.responseStart ?? 0,
    responseEnd,
    duration: overrides.duration ?? Math.max(0, responseEnd - startTime),
    transferSize: overrides.transferSize ?? 0,
    encodedBodySize: overrides.encodedBodySize ?? 0,
    decodedBodySize: overrides.decodedBodySize ?? 0,
    initiatorType: overrides.initiatorType ?? "script",
    toJSON: () => ({}),
  } as PerformanceResourceTiming;
}

function enableBootstrapTrace() {
  process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
  process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE = "1";
  __resetYoutubeBootstrapCacheForTest();
}

function disableBootstrapTrace() {
  delete process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE;
  __resetYoutubeBootstrapCacheForTest();
}

function mockPerformanceNow(sequence: number[]) {
  let i = 0;
  return vi.spyOn(performance, "now").mockImplementation(() => {
    const v = sequence[Math.min(i, sequence.length - 1)]!;
    i += 1;
    return v;
  });
}

beforeEach(() => {
  resetYoutubeBootstrapTrace();
  __resetYoutubeBootstrapCacheForTest();
  mutationObserverCallback = null;
  delete testGlobal.window;
  delete testGlobal.MutationObserver;
  delete process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  delete process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE;
});

afterEach(() => {
  resetYoutubeBootstrapTrace();
  __resetYoutubeBootstrapCacheForTest();
  vi.restoreAllMocks();
  if (ORIGINAL_TRACE === undefined) {
    delete process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = ORIGINAL_TRACE;
  }
  if (ORIGINAL_BOOTSTRAP === undefined) {
    delete process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE;
  } else {
    process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE = ORIGINAL_BOOTSTRAP;
  }
});

describe("isTvYoutubeBootstrapTraceEnabled", () => {
  it("is off by default", () => {
    expect(isTvYoutubeBootstrapTraceEnabled()).toBe(false);
  });

  it("activates only for 1 or true with startup trace", () => {
    process.env.NEXT_PUBLIC_TV_YOUTUBE_BOOTSTRAP_TRACE = "1";
    __resetYoutubeBootstrapCacheForTest();
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
    expect(isTvYoutubeBootstrapTraceActive()).toBe(true);
  });
});

describe("segment calculations", () => {
  it("computes all subsegments for a complete ordered sequence", () => {
    enableBootstrapTrace();
    installDomMocks();
    initYoutubeBootstrapTrace("trace-1");
    notifyBootstrapT6(1000);

    mockPerformanceNow([1100, 1150, 1200, 1450, 1500]);

    recordLooperCommitted({
      looperKind: "desktop",
      source: "global",
      startupGeneration: 1,
    });
    recordPlayerRenderRequested({
      startupGeneration: 1,
      source: "global",
      selectedIndex: 0,
      hasPlaybackUrl: true,
    });
    recordPlayerCommitted({
      startupGeneration: 1,
      source: "global",
    });

    __ingestResourceEntryForTest(
      fakeResource({
        name: "https://www.youtube.com/iframe_api",
        startTime: 1250,
        responseStart: 1300,
        responseEnd: 1400,
      })
    );

    recordApiObjectDetected({
      detectionReason: "poll_detected",
      pollDelayMs: 200,
      apiAlreadyPresent: false,
      startupGeneration: 1,
    });

    const container = makePlayerContainer();
    attachIframeInsertionObserver({
      container,
      startupGeneration: 1,
      source: "global",
    });
    container.appendChild(makeIframeElement());

    notifyBootstrapT8(2000);

    const fields = buildYoutubeBootstrapSummaryFields(1000, 2000);
    expect(fields.T6_toLooperCommitMs).toBe(100);
    expect(fields.T6_toPlayerRenderRequestedMs).toBe(150);
    expect(fields.T6_toPlayerCommitMs).toBe(200);
    expect(fields.playerCommitToApiResourceStartMs).toBe(50);
    expect(fields.apiResourceStartToFinishMs).toBe(150);
    expect(fields.apiResourceFinishToObjectDetectedMs).toBe(50);
    expect(fields.playerCommitToApiObjectDetectedMs).toBe(250);
    expect(fields.playerCommitToIframeInsertedMs).toBe(300);
    expect(fields.apiObjectDetectedToIframeInsertedMs).toBe(50);
    expect(fields.iframeInsertedToT8Ms).toBe(500);
    expect(fields.playerCommitToT8Ms).toBe(800);
  });
});

describe("resource timing", () => {
  it("retains limited cross-origin timing without false zero-duration conclusion", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-1");

    __ingestResourceEntryForTest(
      fakeResource({
        name: "https://www.youtube.com/iframe_api",
        startTime: 500,
        responseStart: 0,
        responseEnd: 0,
        duration: 0,
        transferSize: 0,
        encodedBodySize: 0,
      })
    );

    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.resourceEntries).toHaveLength(1);
    expect(state?.resourceEntries[0]?.timingDetailLevel).toBe("limited");
    expect(state?.resourceEntries[0]?.cacheInference).toBe("unavailable");
    expect(JSON.stringify(state?.resourceEntries)).not.toContain("iframe_api?");
    expect(state?.youtubeApiResourceCount).toBe(1);
  });

  it("collects pre-observer buffered resources via scan", () => {
    enableBootstrapTrace();
    const existing = fakeResource({
      name: "https://www.youtube.com/iframe_api",
      startTime: 100,
      responseEnd: 200,
    });
    const getEntriesSpy = vi
      .spyOn(performance, "getEntriesByType")
      .mockReturnValue([existing] as PerformanceEntryList);

    initYoutubeBootstrapTrace("trace-2");
    expect(getEntriesSpy).toHaveBeenCalledWith("resource");
    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.youtubeApiResourceCount).toBe(1);
    expect(state?.apiResourceStartMs).toBe(100);
    expect(state?.apiResourceFinishMs).toBe(200);
  });

  it("counts duplicate iframe_api resources and emits diagnostic", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-dup");

    __ingestResourceEntryForTest(
      fakeResource({
        name: "https://www.youtube.com/iframe_api",
        startTime: 100,
        responseEnd: 200,
      })
    );
    __ingestResourceEntryForTest(
      fakeResource({
        name: "https://www.youtube.com/iframe_api",
        startTime: 300,
        responseEnd: 400,
      })
    );

    const fields = buildYoutubeBootstrapSummaryFields(null, null);
    expect(fields.youtubeApiResourceCount).toBe(2);
    expect(computeBootstrapDiagnostics(fields)).toContain(
      "duplicate_api_resource"
    );
  });
});

describe("API already present at player commit", () => {
  it("detects immediately without requiring API network resource", () => {
    enableBootstrapTrace();
    installDomMocks();
    initYoutubeBootstrapTrace("trace-reuse");
    notifyBootstrapT6(500);
    mockPerformanceNow([600]);

    (testGlobal.window as { YT?: { Player?: unknown } }).YT = {
      Player: class {},
    };

    const result = recordPlayerCommitted({
      startupGeneration: 1,
      source: "global",
    });

    expect(result.youtubeApiPresentAtCommit).toBe(true);
    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.youtubeApiDetectionReason).toBe("present_at_player_commit");
    expect(state?.apiObjectDetectedEmitted).toBe(true);

    const fields = buildYoutubeBootstrapSummaryFields(500, null);
    const diagnostics = computeBootstrapDiagnostics(fields);
    expect(diagnostics).not.toContain(
      "api_object_detected_before_resource_start"
    );
    expect(diagnostics).not.toContain("api_resource_start_missing");

    delete (testGlobal.window as { YT?: { Player?: unknown } }).YT;
  });
});

describe("iframe insertion observer", () => {
  it("emits first insertion and never stores iframe src", () => {
    enableBootstrapTrace();
    installDomMocks();
    initYoutubeBootstrapTrace("trace-iframe");
    mockPerformanceNow([1000, 1100]);

    recordPlayerCommitted({
      startupGeneration: 1,
      source: "community",
    });

    const container = makePlayerContainer();
    attachIframeInsertionObserver({
      container,
      startupGeneration: 1,
      source: "community",
    });

    container.appendChild(
      makeIframeElement("https://www.youtube.com/embed/SECRET_VIDEO_ID")
    );

    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.youtubeIframeInsertionCount).toBe(1);
    expect(state?.youtubeDuplicateIframeInsertionCount).toBe(0);
    expect(state?.iframeInsertedMs).toBe(1100);
    expect(JSON.stringify(state)).not.toContain("SECRET_VIDEO_ID");
  });

  it("counts duplicate iframe when a wrapper adds multiple iframes in one mutation", () => {
    enableBootstrapTrace();
    installDomMocks();
    initYoutubeBootstrapTrace("trace-iframe-dup");
    mockPerformanceNow([1000, 1100, 1200]);

    recordPlayerCommitted({
      startupGeneration: 1,
      source: "global",
    });

    const container = makePlayerContainer();
    attachIframeInsertionObserver({
      container,
      startupGeneration: 1,
      source: "global",
    });

    const wrapper = {
      tagName: "DIV",
      querySelector: (sel: string) =>
        sel === "iframe" ? makeIframeElement() : null,
    } as unknown as Element;
    container.appendChild(wrapper);

    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.youtubeIframeInsertionCount).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(state)).not.toContain("/embed/");
  });
});

describe("long tasks", () => {
  it("aggregates T2→T8 and T6→T8 windows", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-lt");
    notifyBootstrapT6(1000);

    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.longTaskObserverSupported).toBe(false);

    __recordLongTaskForTest({
      startTime: 500,
      duration: 100,
    } as PerformanceEntry);
    __recordLongTaskForTest({
      startTime: 1500,
      duration: 80,
    } as PerformanceEntry);

    notifyBootstrapT8(5000);

    __recordLongTaskForTest({
      startTime: 6000,
      duration: 200,
    } as PerformanceEntry);

    const fields = buildYoutubeBootstrapSummaryFields(1000, 5000);
    expect(fields.longTaskCountT2ToT8).toBe(2);
    expect(fields.longTaskTotalDurationMsT2ToT8).toBe(180);
    expect(fields.longTaskMaxDurationMsT2ToT8).toBe(100);
    expect(fields.longTaskCountT6ToT8).toBe(1);
    expect(fields.longTaskTotalDurationMsT6ToT8).toBe(80);
    expect(fields.longTaskMaxDurationMsT6ToT8).toBe(80);
    expect(computeBootstrapDiagnostics(fields)).toContain(
      "long_task_overlap_T6_T8"
    );
  });
});

describe("stale trace / generation rejection", () => {
  it("rejects callbacks from old startup generation", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-stale");
    mockPerformanceNow([100, 200]);

    recordLooperCommitted({
      looperKind: "mobile",
      source: "global",
      startupGeneration: 2,
    });
    recordLooperCommitted({
      looperKind: "mobile",
      source: "global",
      startupGeneration: 1,
    });

    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.looperCommitCount).toBe(1);
  });

  it("rejects callbacks from old trace id", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-new");
    mockPerformanceNow([100]);

    recordPlayerRenderRequested({
      startupGeneration: 1,
      source: "global",
      selectedIndex: 0,
      hasPlaybackUrl: true,
      traceId: "trace-old",
    });

    const state = __getYoutubeBootstrapStateForTest();
    expect(state?.playerRenderRequestedMs).toBeNull();
  });
});

describe("flag off — no overhead", () => {
  it("does not initialize observers or mutate summary fields", () => {
    process.env.NEXT_PUBLIC_TV_STARTUP_TRACE_ENABLED = "1";
    disableBootstrapTrace();

    initYoutubeBootstrapTrace("trace-off");
    expect(__getYoutubeBootstrapStateForTest()).toBeNull();

    installDomMocks();
    const container = makePlayerContainer();
    attachIframeInsertionObserver({
      container,
      startupGeneration: 1,
      source: "global",
    });
    expect(__getYoutubeBootstrapStateForTest()).toBeNull();

    const summary = {
      segments: {} as Record<string, number | null>,
      segmentDiagnostics: [] as string[],
      T6_toPlayerCommitMs: null,
      youtubeApiResourceCount: 0,
    };
    applyYoutubeBootstrapToSummary(summary, 1000, 2000);
    expect(summary.T6_toPlayerCommitMs).toBeNull();
    expect(summary.youtubeApiResourceCount).toBe(0);
    expect(summary.segments.T6_playerCommit).toBeUndefined();
  });
});

describe("applyYoutubeBootstrapToSummary", () => {
  it("merges bootstrap segments into summary when enabled", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-summary");
    notifyBootstrapT6(1000);
    mockPerformanceNow([1200]);
    recordPlayerCommitted({
      startupGeneration: 1,
      source: "global",
    });
    notifyBootstrapT8(2000);

    const summary = {
      segments: {} as Record<string, number | null>,
      segmentDiagnostics: [] as string[],
    };
    applyYoutubeBootstrapToSummary(summary, 1000, 2000);
    expect(summary.segments.T6_playerCommit).toBe(200);
    expect(summary.segments.playerCommit_T8).toBe(800);
  });
});

describe("API resource connection timing (C2.1)", () => {
  it("captures connection fields from first iframe_api resource", () => {
    enableBootstrapTrace();
    initYoutubeBootstrapTrace("trace-conn");

    __ingestResourceEntryForTest({
      name: "https://www.youtube.com/iframe_api",
      entryType: "resource",
      startTime: 100,
      domainLookupStart: 100,
      domainLookupEnd: 110,
      connectStart: 110,
      connectEnd: 160,
      secureConnectionStart: 130,
      requestStart: 160,
      responseStart: 200,
      responseEnd: 350,
      duration: 250,
      transferSize: 1000,
      encodedBodySize: 900,
      decodedBodySize: 900,
      initiatorType: "script",
    } as PerformanceResourceTiming);

    const fields = buildYoutubeBootstrapSummaryFields(null, null);
    expect(fields.youtubeApiDnsDurationMs).toBe(10);
    expect(fields.youtubeApiConnectDurationMs).toBe(50);
    expect(fields.youtubeApiTlsDurationMs).toBe(30);
    expect(fields.youtubeApiRequestWaitDurationMs).toBe(40);
    expect(fields.youtubeApiResponseDurationMs).toBe(150);
    expect(fields.youtubeApiConnectionReusedOrPreconnected).toBe(false);
  });
});
