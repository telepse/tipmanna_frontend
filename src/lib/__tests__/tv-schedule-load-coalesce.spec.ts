import { describe, expect, it, vi } from "vitest";
import { createTvScheduleLoadCoalescer } from "../tv-schedule-load-coalesce";

describe("createTvScheduleLoadCoalescer", () => {
  it("runs a single fn when two callers invoke concurrently", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const fn = vi.fn(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    await Promise.all([runCoalesced(fn), runCoalesced(fn)]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows a new run after the prior promise settles", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const fn = vi.fn(async () => {});

    await runCoalesced(fn);
    await runCoalesced(fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("propagates rejection to all awaiters", async () => {
    const runCoalesced = createTvScheduleLoadCoalescer();
    const err = new Error("fail");
    const fn = vi.fn(async () => {
      throw err;
    });

    await expect(
      Promise.all([runCoalesced(fn), runCoalesced(fn)])
    ).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
