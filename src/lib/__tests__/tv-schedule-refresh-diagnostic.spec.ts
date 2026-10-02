import { describe, expect, it } from "vitest";

import {
  liveTargetMovedBackwardMatteringly,
  liveTargetSameRowBackwardDeltaSeconds,
  readScheduleRevisionFromPayload,
  resolveLiveTargetWithDrift,
} from "@/lib/tv-schedule-refresh-diagnostic";
import type { ScheduleItem } from "@/lib/tv/broadcastEngine";

const items: ScheduleItem[] = [
  {
    id: "a",
    duration: 100,
    segmentKind: "regular",
    channel: {
      url: "https://www.youtube.com/watch?v=abc",
    },
  },
];

describe("tv-schedule-refresh-diagnostic", () => {
  it("reads revision fields from schedule payload", () => {
    expect(
      readScheduleRevisionFromPayload({
        scheduleRevisions: { ongoing: 42 },
        checksum: "chk",
        activeScheduleId: "sched-1",
      })
    ).toEqual({
      scheduleRevision: 42,
      checksum: "chk",
      activeScheduleId: "sched-1",
      etag: null,
    });
  });

  it("same-row backward delta is zero when target moves forward", () => {
    const before = {
      scheduleIndex: 13,
      offsetSeconds: 466,
      loopPosition: 0,
    };

    const after = {
      scheduleIndex: 13,
      offsetSeconds: 472,
      loopPosition: 0,
    };

    expect(liveTargetSameRowBackwardDeltaSeconds(before, after)).toBe(0);
    expect(liveTargetMovedBackwardMatteringly(before, after, 3)).toBe(false);
  });

  it("same-row backward delta is positive when target moves back", () => {
    const before = {
      scheduleIndex: 0,
      offsetSeconds: 120,
      loopPosition: 120,
    };

    const after = {
      scheduleIndex: 0,
      offsetSeconds: 115,
      loopPosition: 115,
    };

    expect(liveTargetSameRowBackwardDeltaSeconds(before, after)).toBe(5);
    expect(liveTargetMovedBackwardMatteringly(before, after, 3)).toBe(true);
    expect(liveTargetMovedBackwardMatteringly(before, after, 6)).toBe(false);
  });

  it("resolves live target from drift-adjusted clock", () => {
    const epoch = Date.now() - 50_000;

    const target = resolveLiveTargetWithDrift(items, epoch, 100, 0);

    expect(target).not.toBeNull();
    expect(target!.scheduleIndex).toBe(0);
    expect(target!.offsetSeconds).toBeGreaterThanOrEqual(49);
    expect(target!.offsetSeconds).toBeLessThanOrEqual(51);
  });
});
