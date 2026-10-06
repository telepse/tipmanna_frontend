import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isIframeProbeGenerationStillActive,
  probeTvYoutubeIframeApiReachability,
  retryTvYoutubeIframeApiReachability,
  watchSharedYoutubeIframeApiLateReady,
} from "../tv-youtube-reachability";

const acquireMock = vi.fn();

vi.mock("../youtube-iframe-api-loader", async importOriginal => {
  const actual =
    await importOriginal<typeof import("../youtube-iframe-api-loader")>();
  return {
    ...actual,
    acquireYoutubeIframeApi: (...args: unknown[]) => acquireMock(...args),
  };
});

beforeEach(() => {
  acquireMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("probeTvYoutubeIframeApiReachability", () => {
  it("returns ready when loader already ready", async () => {
    acquireMock.mockResolvedValue({
      state: "ready",
      outcome: "reused_existing_object",
    });

    await expect(probeTvYoutubeIframeApiReachability()).resolves.toBe("ready");
    expect(acquireMock).toHaveBeenCalledWith();
  });

  it("shared in-flight loader — concurrent probes observe the same acquire promise", async () => {
    let resolveAcquire!: (value: { state: "ready"; outcome: string }) => void;
    const inflight = new Promise<{
      state: "ready";
      outcome: string;
    }>(resolve => {
      resolveAcquire = resolve;
    });
    acquireMock.mockReturnValue(inflight);

    const p1 = probeTvYoutubeIframeApiReachability({ probeTimeoutMs: 5000 });
    const p2 = probeTvYoutubeIframeApiReachability({ probeTimeoutMs: 5000 });
    expect(acquireMock).toHaveBeenCalledTimes(2);

    resolveAcquire!({ state: "ready", outcome: "script_inserted" });
    await expect(Promise.all([p1, p2])).resolves.toEqual(["ready", "ready"]);
  });

  it("returns timed_out on local probe timeout without waiting for loader", async () => {
    acquireMock.mockReturnValue(new Promise(() => {}));

    const pending = probeTvYoutubeIframeApiReachability({
      probeTimeoutMs: 3000,
    });
    vi.advanceTimersByTime(3000);
    await expect(pending).resolves.toBe("timed_out");
  });

  it("does not pass absoluteDeadlineMs to acquireYoutubeIframeApi", async () => {
    acquireMock.mockReturnValue(new Promise(() => {}));

    void probeTvYoutubeIframeApiReachability({ probeTimeoutMs: 1000 });
    expect(acquireMock).toHaveBeenCalledWith();
    expect(acquireMock.mock.calls[0]).toHaveLength(0);
  });

  it("returns failed when loader reports failure", async () => {
    acquireMock.mockResolvedValue({ state: "failed", outcome: "failed" });
    await expect(probeTvYoutubeIframeApiReachability()).resolves.toBe("failed");
  });

  it("returns timed_out when loader outcome is timed_out", async () => {
    acquireMock.mockResolvedValue({ state: "failed", outcome: "timed_out" });
    await expect(probeTvYoutubeIframeApiReachability()).resolves.toBe(
      "timed_out"
    );
  });

  it("retry after failure can call acquire again", async () => {
    acquireMock
      .mockResolvedValueOnce({ state: "failed", outcome: "failed" })
      .mockResolvedValueOnce({
        state: "ready",
        outcome: "reused_existing_object",
      });

    await expect(probeTvYoutubeIframeApiReachability()).resolves.toBe("failed");
    await expect(retryTvYoutubeIframeApiReachability()).resolves.toBe("ready");
    expect(acquireMock).toHaveBeenCalledTimes(2);
  });

  it("does not insert scripts (delegates only to acquireYoutubeIframeApi)", async () => {
    acquireMock.mockResolvedValue({
      state: "ready",
      outcome: "script_inserted",
    });
    await probeTvYoutubeIframeApiReachability();
    expect(acquireMock).toHaveBeenCalledTimes(1);
  });
});

describe("isIframeProbeGenerationStillActive", () => {
  it("requires mount and matching generation", () => {
    expect(isIframeProbeGenerationStillActive(1, 1, true)).toBe(true);
    expect(isIframeProbeGenerationStillActive(1, 2, true)).toBe(false);
    expect(isIframeProbeGenerationStillActive(1, 1, false)).toBe(false);
  });
});

describe("watchSharedYoutubeIframeApiLateReady", () => {
  it("notifies onReady when shared acquire later resolves ready", async () => {
    let resolveAcquire!: (value: { state: "ready"; outcome: string }) => void;
    acquireMock.mockReturnValue(
      new Promise(resolve => {
        resolveAcquire = resolve;
      })
    );

    const onReady = vi.fn();
    const active = true;
    const handle = watchSharedYoutubeIframeApiLateReady({
      isProbeGenerationActive: () => active,
      onReady,
    });

    resolveAcquire!({ state: "ready", outcome: "script_inserted" });
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
    handle.cancel();
  });

  it("does not notify after cancel (unmount / newer probe)", async () => {
    acquireMock.mockResolvedValue({
      state: "ready",
      outcome: "reused_existing_object",
    });

    const onReady = vi.fn();
    const handle = watchSharedYoutubeIframeApiLateReady({
      isProbeGenerationActive: () => true,
      onReady,
    });
    handle.cancel();
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
  });

  it("does not notify when generation is inactive", async () => {
    acquireMock.mockResolvedValue({
      state: "ready",
      outcome: "reused_existing_object",
    });

    const onReady = vi.fn();
    watchSharedYoutubeIframeApiLateReady({
      isProbeGenerationActive: () => false,
      onReady,
    });
    await Promise.resolve();
    expect(onReady).not.toHaveBeenCalled();
  });

  it("recovers after local probe timeout when acquire completes later", async () => {
    let resolveAcquire!: (value: { state: "ready"; outcome: string }) => void;
    const inflight = new Promise<{
      state: "ready";
      outcome: string;
    }>(resolve => {
      resolveAcquire = resolve;
    });
    acquireMock.mockReturnValue(inflight);

    const pending = probeTvYoutubeIframeApiReachability({
      probeTimeoutMs: 1000,
    });
    vi.advanceTimersByTime(1000);
    await expect(pending).resolves.toBe("timed_out");

    const onReady = vi.fn();
    watchSharedYoutubeIframeApiLateReady({
      isProbeGenerationActive: () => true,
      onReady,
    });
    resolveAcquire!({ state: "ready", outcome: "script_inserted" });
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(acquireMock).toHaveBeenCalledTimes(2);
  });
});
