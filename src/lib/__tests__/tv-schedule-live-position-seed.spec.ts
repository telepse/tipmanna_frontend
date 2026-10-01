import { describe, expect, it } from "vitest";

import { shouldSeedLivePositionFromSchedulePayload } from "@/lib/tv-schedule-live-position-seed";

const items = [
  {
    id: "a",
    channel: { url: "https://youtube.com/watch?v=Ffs0YHm2jks" },
  },
  {
    id: "b",
    channel: { url: "https://youtube.com/watch?v=OtherVideo1" },
  },
];

const base = {
  live: { scheduleIndex: 0, offsetSeconds: 144 },
  items,
  activeScheduleId: "sched-1",
  previousActiveScheduleId: "sched-1" as string | null,
  currentScheduleIndex: 0,
  currentVideoId: "Ffs0YHm2jks",
  hasEstablishedPlaybackSync: false,
};

describe("shouldSeedLivePositionFromSchedulePayload", () => {
  it("cold start + cache — seeds when no established sync", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "session_cache_bootstrap",
        hasEstablishedPlaybackSync: false,
      })
    ).toEqual({
      seed: true,
      reason: "session_cache_bootstrap_no_established_sync",
    });

    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "fallback_cache",
        hasEstablishedPlaybackSync: false,
      })
    ).toEqual({ seed: true, reason: "fallback_cache_no_established_sync" });
  });

  it("existing same row/video + failed refresh — does not reseed stale livePosition", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "fallback_cache",
        hasEstablishedPlaybackSync: true,
        live: { scheduleIndex: 0, offsetSeconds: 144 },
        currentScheduleIndex: 0,
        currentVideoId: "Ffs0YHm2jks",
      })
    ).toEqual({ seed: false, reason: "fallback_preserve_same_row_video" });
  });

  it("repeated fallback refresh — preserves sync on each reapply", () => {
    const input = {
      ...base,
      source: "fallback_cache" as const,
      hasEstablishedPlaybackSync: true,
    };
    for (let i = 0; i < 5; i++) {
      expect(shouldSeedLivePositionFromSchedulePayload(input)).toEqual({
        seed: false,
        reason: "fallback_preserve_same_row_video",
      });
    }
  });

  it("fresh successful schedule — always seeds", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "network_success",
        hasEstablishedPlaybackSync: true,
        live: { scheduleIndex: 0, offsetSeconds: 200 },
      })
    ).toEqual({ seed: true, reason: "network_success" });
  });

  it("schedule row change in cached payload — seeds transition", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "fallback_cache",
        hasEstablishedPlaybackSync: true,
        live: { scheduleIndex: 1, offsetSeconds: 10 },
        currentScheduleIndex: 0,
        currentVideoId: "Ffs0YHm2jks",
      })
    ).toEqual({ seed: true, reason: "fallback_cache_index_changed" });
  });

  it("video change at same index — seeds", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "fallback_cache",
        hasEstablishedPlaybackSync: true,
        items: [
          { channel: { url: "https://youtube.com/watch?v=NewVideoAt0" } },
        ],
        live: { scheduleIndex: 0, offsetSeconds: 144 },
        currentScheduleIndex: 0,
        currentVideoId: "Ffs0YHm2jks",
      })
    ).toEqual({ seed: true, reason: "fallback_cache_video_changed" });
  });

  it("active schedule id change — seeds", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "fallback_cache",
        hasEstablishedPlaybackSync: true,
        activeScheduleId: "sched-2",
        previousActiveScheduleId: "sched-1",
      })
    ).toEqual({ seed: true, reason: "fallback_cache_schedule_id_changed" });
  });

  it("session cache bootstrap with established same row — preserves like fallback", () => {
    expect(
      shouldSeedLivePositionFromSchedulePayload({
        ...base,
        source: "session_cache_bootstrap",
        hasEstablishedPlaybackSync: true,
      })
    ).toEqual({
      seed: false,
      reason: "session_cache_preserve_same_row_video",
    });
  });
});
