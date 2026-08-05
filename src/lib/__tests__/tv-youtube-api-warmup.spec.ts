import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetTvYoutubeApiWarmupForTest,
  __getTvYoutubeApiWarmupStateForTest,
  applyTvYoutubeApiWarmupToSummary,
  buildTvYoutubeApiWarmupSummaryFields,
  recordYoutubeChildMountDeferred,
  recordYoutubeChildMountReleased,
  recordYoutubeApiPresentAtT6,
  requestTvYoutubeApiWarmup,
  shouldDeferYoutubeChildMount,
  TV_YOUTUBE_API_WARMUP_TIMEOUT_MS,
  type TvYoutubeApiWarmupSummaryFields,
} from "../tv-youtube-api-warmup";
import {
  __resetYoutubeIframeApiLoaderForTest,
  acquireYoutubeIframeApi,
  isYoutubeIframeApiReady,
} from "../youtube-iframe-api-loader";

vi.mock("../youtube-iframe-api-loader", async importOriginal => {
  const actual =
    await importOriginal<typeof import("../youtube-iframe-api-loader")>();
  return {
    ...actual,
    acquireYoutubeIframeApi: vi.fn(actual.acquireYoutubeIframeApi),
    isYoutubeIframeApiReady: vi.fn(actual.isYoutubeIframeApiReady),
  };
});

const ORIGINAL = process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP;

type WindowWithYt = Window & { YT?: { Player?: unknown } };
const testGlobal = globalThis as unknown as { window?: WindowWithYt };

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(async () => {
  __resetTvYoutubeApiWarmupForTest();
  __resetYoutubeIframeApiLoaderForTest();
  delete process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP;
  testGlobal.window = {} as WindowWithYt;
  (globalThis as { window: WindowWithYt }).window = testGlobal.window;
  vi.mocked(acquireYoutubeIframeApi).mockClear();
  const actual = await import("../youtube-iframe-api-loader");
  vi.mocked(acquireYoutubeIframeApi).mockImplementation(
    actual.acquireYoutubeIframeApi
  );
  vi.mocked(isYoutubeIframeApiReady).mockImplementation(
    actual.isYoutubeIframeApiReady
  );
});

afterEach(() => {
  __resetTvYoutubeApiWarmupForTest();
  __resetYoutubeIframeApiLoaderForTest();
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP;
  } else {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = ORIGINAL;
  }
  delete testGlobal.window;
});

describe("requestTvYoutubeApiWarmup", () => {
  it("no-ops when flag is off", () => {
    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    expect(__getTvYoutubeApiWarmupStateForTest()?.requested).toBeFalsy();
    expect(acquireYoutubeIframeApi).not.toHaveBeenCalled();
  });

  it("requests once per document with 8s absolute deadline", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "ready",
      outcome: "script_inserted",
    });

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });

    const state = __getTvYoutubeApiWarmupStateForTest();
    expect(state?.requested).toBe(true);
    expect(acquireYoutubeIframeApi).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(acquireYoutubeIframeApi).mock.calls[0]![0];
    expect(arg?.absoluteDeadlineMs).toBe(
      (state?.requestedAtMs ?? 0) + TV_YOUTUBE_API_WARMUP_TIMEOUT_MS
    );

    await flushMicrotasks();
    expect(state?.outcome).toBe("resolved_by_warmup");
  });

  it("does not re-request within same document (source switch)", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "ready",
      outcome: "reused_existing_object",
    });

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    expect(acquireYoutubeIframeApi).toHaveBeenCalledTimes(1);
    await flushMicrotasks();
  });

  it("records reused_existing_object outcome", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "ready",
      outcome: "reused_existing_object",
    });

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    await flushMicrotasks();

    expect(__getTvYoutubeApiWarmupStateForTest()?.outcome).toBe(
      "reused_existing_object"
    );
  });

  it("records timed_out_player_fallback outcome", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "failed",
      outcome: "timed_out",
    });

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    await flushMicrotasks();

    expect(__getTvYoutubeApiWarmupStateForTest()?.outcome).toBe(
      "timed_out_player_fallback"
    );
  });

  it("records failed_player_fallback outcome", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "failed",
      outcome: "failed",
    });

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    await flushMicrotasks();

    expect(__getTvYoutubeApiWarmupStateForTest()?.outcome).toBe(
      "failed_player_fallback"
    );
  });
});

describe("child mount coordination", () => {
  it("defers child when flag on and API not ready", () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockReturnValue(new Promise(() => {}));
    vi.mocked(isYoutubeIframeApiReady).mockReturnValue(false);
    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });

    expect(shouldDeferYoutubeChildMount()).toBe(true);
    recordYoutubeChildMountDeferred({ startupGeneration: 1 });
    expect(__getTvYoutubeApiWarmupStateForTest()?.childMountDeferred).toBe(
      true
    );
  });

  it("does not defer when flag off", () => {
    expect(shouldDeferYoutubeChildMount()).toBe(false);
  });
});

describe("buildTvYoutubeApiWarmupSummaryFields", () => {
  it("computes resolved before T6 and lead before player commit", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "ready",
      outcome: "script_inserted",
    });

    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    now = 2500;
    await flushMicrotasks();

    recordYoutubeApiPresentAtT6(true);
    recordYoutubeChildMountReleased({
      startupGeneration: 1,
      fallbackReason: "warmup_resolved",
    });

    const fields = buildTvYoutubeApiWarmupSummaryFields(3000, 4000);
    expect(fields.youtubeApiWarmupResolvedBeforeT6).toBe(true);
    expect(fields.youtubeApiWarmupLeadBeforePlayerCommitMs).toBe(1500);
    expect(fields.earlyYoutubeApiWarmupDurationMs).toBe(1500);
  });

  it("records resolved after T6 when warm-up is slow", async () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    vi.mocked(acquireYoutubeIframeApi).mockResolvedValue({
      state: "ready",
      outcome: "script_inserted",
    });

    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);

    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
    now = 5000;
    await flushMicrotasks();

    const fields = buildTvYoutubeApiWarmupSummaryFields(3000, 6000);
    expect(fields.youtubeApiWarmupResolvedBeforeT6).toBe(false);
    expect(fields.youtubeApiWarmupLeadBeforePlayerCommitMs).toBe(1000);
  });
});

describe("applyTvYoutubeApiWarmupToSummary", () => {
  it("adds duplicate API resource diagnostic when count > 1", () => {
    process.env.NEXT_PUBLIC_TV_EARLY_YOUTUBE_API_WARMUP = "1";
    const summary = {
      segmentDiagnostics: [] as string[],
      youtubeApiResourceCount: 2,
    };
    applyTvYoutubeApiWarmupToSummary(summary, 3000, 4000);
    expect(summary.segmentDiagnostics).toContain(
      "warmup_fallback_duplicate_api_resource"
    );
  });

  it("sets disabled outcome when flag off", () => {
    const summary: {
      segmentDiagnostics: string[];
    } & Partial<TvYoutubeApiWarmupSummaryFields> = { segmentDiagnostics: [] };
    applyTvYoutubeApiWarmupToSummary(summary);
    expect(summary.earlyYoutubeApiWarmupOutcome).toBe("disabled");
  });
});
