import { describe, expect, it } from "vitest";

import type { ScheduleItem } from "@/lib/tv/broadcastResolver";
import {
  belongsToEnforcement,
  resolveEnforcementPlaybackMode,
  skipNoticeSegments,
} from "@/lib/tv/enforcement-playback-mode";

const baseChannel = { url: "https://youtube.com/watch?v=abc" };

function makeSchedule(): ScheduleItem[] {
  return [
    {
      id: "regular",
      duration: 3600,
      axisStartSec: 0,
      axisEndSec: 3600,
      channel: { ...baseChannel, title: "Regular" },
    },
    {
      id: "notice-pre",
      duration: 60,
      axisStartSec: 3600,
      axisEndSec: 3660,
      segmentKind: "notice",
      noticePhase: "pre",
      enforcementId: "enf1",
      channel: { ...baseChannel, title: "Program Start" },
    },
    {
      id: "enforcement",
      duration: 100,
      axisStartSec: 3660,
      axisEndSec: 3760,
      segmentKind: "enforcement",
      enforcementId: "enf1",
      channel: { ...baseChannel, title: "Forced program" },
    },
  ];
}

describe("belongsToEnforcement", () => {
  it("matches notice and enforcement rows for the same program", () => {
    const items = makeSchedule();
    expect(belongsToEnforcement(items[1], "enf1")).toBe(true);
    expect(belongsToEnforcement(items[2], "enf1")).toBe(true);
    expect(belongsToEnforcement(items[0], "enf1")).toBe(false);
  });
});

describe("skipNoticeSegments", () => {
  it("advances past consecutive notice rows", () => {
    const items = makeSchedule();
    expect(skipNoticeSegments(items, 1)).toBe(2);
  });

  it("returns start index when every remaining row is a notice", () => {
    const items: ScheduleItem[] = [
      {
        id: "notice-only",
        duration: 60,
        segmentKind: "notice",
        enforcementId: "enf1",
        channel: baseChannel,
      },
    ];
    expect(skipNoticeSegments(items, 0)).toBe(0);
  });
});

describe("resolveEnforcementPlaybackMode", () => {
  const items = makeSchedule();
  const broadcastEpoch = 1_700_000_000_000;
  const totalDuration = 43_200;

  it("returns bootstrap when enforcement id is empty", () => {
    expect(
      resolveEnforcementPlaybackMode(
        items,
        "  ",
        broadcastEpoch,
        totalDuration,
        broadcastEpoch + 3_650_000
      )
    ).toEqual({ kind: "bootstrap" });
  });

  it("returns live when the program is on-axis (including notice slate)", () => {
    const now = broadcastEpoch + 3_630_000;
    expect(
      resolveEnforcementPlaybackMode(
        items,
        "enf1",
        broadcastEpoch,
        totalDuration,
        now
      )
    ).toEqual({ kind: "live", scheduleIndex: 1 });
  });

  it("returns local_schedule off-axis when rows exist in the schedule", () => {
    const now = broadcastEpoch + 1_000;
    expect(
      resolveEnforcementPlaybackMode(
        items,
        "enf1",
        broadcastEpoch,
        totalDuration,
        now
      )
    ).toEqual({ kind: "local_schedule", scheduleIndex: 2 });
  });

  it("returns bootstrap when no enforcement rows are present", () => {
    const regularOnly = [items[0]!];
    expect(
      resolveEnforcementPlaybackMode(
        regularOnly,
        "enf1",
        broadcastEpoch,
        totalDuration,
        broadcastEpoch + 500
      )
    ).toEqual({ kind: "bootstrap" });
  });
});
