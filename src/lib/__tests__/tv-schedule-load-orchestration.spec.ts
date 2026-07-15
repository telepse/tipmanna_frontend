import { afterEach, describe, expect, it, vi } from "vitest";
import { runTvScheduleLoadOrchestration } from "../tv-schedule-load-orchestration";

describe("runTvScheduleLoadOrchestration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("coalesces two concurrent loads for the same community into one fetch", async () => {
    const fetch = vi.fn(async () => ({
      kind: "success" as const,
      body: { items: [] },
      etag: "e1",
    }));
    const applySuccess = vi.fn();

    await Promise.all([
      runTvScheduleLoadOrchestration({
        communityId: null,
        fetch,
        getCurrentCommunityId: () => null,
        applySuccess,
        scheduleRetry: vi.fn(),
        scheduleReload: vi.fn(),
      }),
      runTvScheduleLoadOrchestration({
        communityId: null,
        fetch,
        getCurrentCommunityId: () => null,
        applySuccess,
        scheduleRetry: vi.fn(),
        scheduleReload: vi.fn(),
      }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(applySuccess).toHaveBeenCalledTimes(1);
  });

  it("does not coalesce concurrent loads for different communities", async () => {
    const fetch = vi.fn(async (cid: string | null) => ({
      kind: "success" as const,
      body: { communityId: cid },
      etag: null,
    }));
    const applySuccess = vi.fn();

    await Promise.all([
      runTvScheduleLoadOrchestration({
        communityId: "comm-a",
        fetch,
        getCurrentCommunityId: () => "comm-a",
        applySuccess,
        scheduleRetry: vi.fn(),
        scheduleReload: vi.fn(),
      }),
      runTvScheduleLoadOrchestration({
        communityId: "comm-b",
        fetch,
        getCurrentCommunityId: () => "comm-b",
        applySuccess,
        scheduleRetry: vi.fn(),
        scheduleReload: vi.fn(),
      }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(applySuccess).toHaveBeenCalledTimes(2);
  });

  it("schedules retry after a failed coalesced request", async () => {
    const fetch = vi.fn(async () => ({
      kind: "failure" as const,
      error: new Error("network"),
    }));
    const scheduleRetry = vi.fn();

    await runTvScheduleLoadOrchestration({
      communityId: null,
      fetch,
      getCurrentCommunityId: () => null,
      applySuccess: vi.fn(),
      scheduleRetry,
      scheduleReload: vi.fn(),
    });

    expect(scheduleRetry).toHaveBeenCalledTimes(1);
  });

  it("discards stale success and schedules reload when community changed", async () => {
    let current: string | null = "comm-a";
    const fetch = vi.fn(async () => {
      current = "comm-b";
      return {
        kind: "success" as const,
        body: { items: ["stale"] },
        etag: null,
      };
    });
    const applySuccess = vi.fn();
    const scheduleReload = vi.fn();

    await runTvScheduleLoadOrchestration({
      communityId: "comm-a",
      fetch,
      getCurrentCommunityId: () => current,
      applySuccess,
      scheduleRetry: vi.fn(),
      scheduleReload,
    });

    expect(applySuccess).not.toHaveBeenCalled();
    expect(scheduleReload).toHaveBeenCalledWith({ resetRetry: true });
  });

  it("discards stale notModified and schedules reload", async () => {
    let current: string | null = "comm-a";
    const fetch = vi.fn(async () => {
      current = "comm-b";
      return { kind: "notModified" as const };
    });
    const scheduleReload = vi.fn();

    await runTvScheduleLoadOrchestration({
      communityId: "comm-a",
      fetch,
      getCurrentCommunityId: () => current,
      applySuccess: vi.fn(),
      scheduleRetry: vi.fn(),
      scheduleReload,
    });

    expect(scheduleReload).toHaveBeenCalledWith({ resetRetry: true });
  });

  it("discards stale failure cache path and schedules reload instead of retry", async () => {
    let current: string | null = "comm-a";
    const fetch = vi.fn(async () => {
      current = "comm-b";
      return { kind: "failure" as const, error: new Error("fail") };
    });
    const scheduleRetry = vi.fn();
    const scheduleReload = vi.fn();

    await runTvScheduleLoadOrchestration({
      communityId: "comm-a",
      fetch,
      getCurrentCommunityId: () => current,
      applySuccess: vi.fn(),
      scheduleRetry,
      scheduleReload,
    });

    expect(scheduleRetry).not.toHaveBeenCalled();
    expect(scheduleReload).toHaveBeenCalledWith({ resetRetry: true });
  });
});
