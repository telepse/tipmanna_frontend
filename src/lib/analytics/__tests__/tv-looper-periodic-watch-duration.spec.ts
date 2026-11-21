import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackTvLooperWatchDuration } = vi.hoisted(() => ({
  trackTvLooperWatchDuration: vi.fn(),
}));

vi.mock("../tv-looper-analytics", () => ({
  trackTvLooperWatchDuration,
}));

import {
  TV_LOOPER_WATCH_DURATION_TICK_MS,
  TvLooperWatchDurationScheduler,
  computeWatchDurationSec,
  qualifiesWatchDurationEmit,
} from "../tv-looper-periodic-watch-duration";
import type { TvLooperAnalyticsContext } from "../tv-looper-analytics";

const tvLooperCtx: TvLooperAnalyticsContext = {
  eventId: "evt-1",
  channelId: "ch-1",
  analyticsSurface: "tv_looper",
  communityId: null,
};

const communityCtx: TvLooperAnalyticsContext = {
  eventId: "evt-2",
  channelId: "ch-2",
  analyticsSurface: "community_tv_looper",
  communityId: "comm-1",
};

describe("tv-looper periodic watch duration scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits qualifying watch_duration on periodic tick without video end", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    scheduler.bindSegment(
      { itemId: "virt:1", channelId: "ch-1", mode: "GLOBAL" },
      Date.now()
    );

    vi.advanceTimersByTime(TV_LOOPER_WATCH_DURATION_TICK_MS);
    scheduler.onPeriodicTick(tvLooperCtx);

    expect(trackTvLooperWatchDuration).toHaveBeenCalledTimes(1);
    expect(trackTvLooperWatchDuration).toHaveBeenCalledWith(
      tvLooperCtx,
      "virt:1",
      expect.closeTo(30, 0.5),
      "GLOBAL",
      "ch-1"
    );
  });

  it("covers community_tv_looper surface context on periodic tick", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    scheduler.bindSegment(
      { itemId: "virt:9", channelId: "ch-2", mode: "LOCAL" },
      Date.now()
    );
    vi.advanceTimersByTime(TV_LOOPER_WATCH_DURATION_TICK_MS);
    scheduler.onPeriodicTick(communityCtx);

    expect(trackTvLooperWatchDuration).toHaveBeenCalledWith(
      communityCtx,
      "virt:9",
      expect.closeTo(30, 0.5),
      "LOCAL",
      "ch-2"
    );
  });

  it("resets checkpoint after emission so a second tick emits again", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    scheduler.bindSegment(
      { itemId: "virt:1", channelId: "ch-1", mode: "GLOBAL" },
      Date.now()
    );
    vi.advanceTimersByTime(TV_LOOPER_WATCH_DURATION_TICK_MS);
    scheduler.onPeriodicTick(tvLooperCtx);
    vi.advanceTimersByTime(TV_LOOPER_WATCH_DURATION_TICK_MS);
    scheduler.onPeriodicTick(tvLooperCtx);

    expect(trackTvLooperWatchDuration).toHaveBeenCalledTimes(2);
    expect(
      trackTvLooperWatchDuration.mock.calls[1]?.[2]
    ).toBeCloseTo(30, 0.5);
  });

  it("flush on pause emits partial segment without requiring onEnd", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    const start = Date.now();
    scheduler.bindSegment(
      { itemId: "virt:1", channelId: "ch-1", mode: "GLOBAL" },
      start
    );
    vi.advanceTimersByTime(12_000);
    scheduler.flush(tvLooperCtx);

    expect(trackTvLooperWatchDuration).toHaveBeenCalledTimes(1);
    expect(trackTvLooperWatchDuration).toHaveBeenCalledWith(
      tvLooperCtx,
      "virt:1",
      expect.closeTo(12, 0.5),
      "GLOBAL",
      "ch-1"
    );
  });

  it("does not emit sub-threshold duration on flush or tick", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    scheduler.bindSegment(
      { itemId: "virt:1", channelId: "ch-1", mode: "GLOBAL" },
      Date.now()
    );
    vi.advanceTimersByTime(200);
    scheduler.onPeriodicTick(tvLooperCtx);
    scheduler.flush(tvLooperCtx);

    expect(trackTvLooperWatchDuration).not.toHaveBeenCalled();
    expect(qualifiesWatchDurationEmit(0.2)).toBe(false);
    expect(computeWatchDurationSec(Date.now() - 200, Date.now())).toBeCloseTo(
      0.2,
      1
    );
  });

  it("slot-change flush targets the bound segment before rebind", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    scheduler.bindSegment(
      { itemId: "virt:old", channelId: "ch-1", mode: "GLOBAL" },
      Date.now()
    );
    vi.advanceTimersByTime(18_000);
    scheduler.flush(tvLooperCtx);

    scheduler.bindSegment(
      { itemId: "virt:new", channelId: "ch-1", mode: "GLOBAL" },
      Date.now()
    );
    vi.advanceTimersByTime(TV_LOOPER_WATCH_DURATION_TICK_MS);
    scheduler.onPeriodicTick(tvLooperCtx);

    expect(trackTvLooperWatchDuration).toHaveBeenNthCalledWith(
      1,
      tvLooperCtx,
      "virt:old",
      expect.closeTo(18, 0.5),
      "GLOBAL",
      "ch-1"
    );
    expect(trackTvLooperWatchDuration).toHaveBeenNthCalledWith(
      2,
      tvLooperCtx,
      "virt:new",
      expect.closeTo(30, 0.5),
      "GLOBAL",
      "ch-1"
    );
  });

  it("natural end flush emits only remaining time since last checkpoint", () => {
    const scheduler = new TvLooperWatchDurationScheduler();
    scheduler.bindSegment(
      { itemId: "virt:1", channelId: "ch-1", mode: "GLOBAL" },
      Date.now()
    );
    vi.advanceTimersByTime(TV_LOOPER_WATCH_DURATION_TICK_MS);
    scheduler.onPeriodicTick(tvLooperCtx);
    vi.clearAllMocks();

    vi.advanceTimersByTime(8_000);
    scheduler.flush(tvLooperCtx);
    scheduler.reset();

    expect(trackTvLooperWatchDuration).toHaveBeenCalledTimes(1);
    expect(trackTvLooperWatchDuration).toHaveBeenCalledWith(
      tvLooperCtx,
      "virt:1",
      expect.closeTo(8, 0.5),
      "GLOBAL",
      "ch-1"
    );
    expect(scheduler.getSegment()).toBeNull();
  });
});
