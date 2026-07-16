import { describe, expect, it, vi } from "vitest";
import {
  createTvScheduleLoadCoalescer,
  isScheduleResponseStale,
  tvScheduleCoalesceKey,
} from "../tv-schedule-load-coalesce";

describe("tvScheduleCoalesceKey", () => {
  it("maps null to global key", () => {
    expect(tvScheduleCoalesceKey(null)).toBe("__global__");
  });

  it("preserves community id", () => {
    expect(tvScheduleCoalesceKey("comm-1")).toBe("comm-1");
  });
});

describe("isScheduleResponseStale", () => {
  it("returns false when ids match", () => {
    expect(isScheduleResponseStale("a", "a")).toBe(false);
    expect(isScheduleResponseStale(null, null)).toBe(false);
  });

  it("returns true when ids differ", () => {
    expect(isScheduleResponseStale("a", "b")).toBe(true);
    expect(isScheduleResponseStale(null, "b")).toBe(true);
    expect(isScheduleResponseStale("a", null)).toBe(true);
  });
});

describe("createTvScheduleLoadCoalescer", () => {
  it("runs a single fn when two callers invoke concurrently with same key", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const fn = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    await Promise.all([runCoalesced("comm-a", fn), runCoalesced("comm-a", fn)]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs separate fns for different community keys", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const fnA = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 20));
    });
    const fnB = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    await Promise.all([
      runCoalesced("comm-a", fnA),
      runCoalesced("comm-b", fnB),
    ]);
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it("allows a new run after the prior promise settles", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const fn = vi.fn(async () => {});

    await runCoalesced(null, fn);
    await runCoalesced(null, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("propagates rejection to all awaiters", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const err = new Error("fail");
    const fn = vi.fn(async () => {
      throw err;
    });

    await expect(
      Promise.all([runCoalesced("k", fn), runCoalesced("k", fn)])
    ).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
