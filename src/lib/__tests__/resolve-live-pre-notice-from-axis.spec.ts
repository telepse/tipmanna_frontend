import { describe, expect, it } from "vitest";

import type { ScheduleItem } from "@/lib/tv/broadcastResolver";
import { resolveLivePreNoticeFromAxis } from "@/lib/tv/resolve-live-pre-notice-from-axis";

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
      channel: { ...baseChannel, title: "Program Start (Block)" },
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
    {
      id: "notice-post",
      duration: 60,
      axisStartSec: 3760,
      axisEndSec: 3820,
      segmentKind: "notice",
      noticePhase: "post",
      enforcementId: "enf1",
      channel: { ...baseChannel, title: "Program End" },
    },
  ];
}

describe("resolveLivePreNoticeFromAxis", () => {
  const items = makeSchedule();
  const broadcastEpoch = 1_700_000_000_000;
  const totalDuration = 43_200;
  const nowAtLoopSec = (loopSec: number) => broadcastEpoch + loopSec * 1000;

  it("returns null when broadcast inputs are missing", () => {
    expect(
      resolveLivePreNoticeFromAxis([], null, totalDuration, broadcastEpoch)
    ).toBeNull();
    expect(
      resolveLivePreNoticeFromAxis(items, broadcastEpoch, 0, broadcastEpoch)
    ).toBeNull();
  });

  it("returns null off-axis on regular content", () => {
    expect(
      resolveLivePreNoticeFromAxis(
        items,
        broadcastEpoch,
        totalDuration,
        nowAtLoopSec(100)
      )
    ).toBeNull();
  });

  it("returns countdown metadata at start, mid, and end of pre-notice", () => {
    const start = resolveLivePreNoticeFromAxis(
      items,
      broadcastEpoch,
      totalDuration,
      nowAtLoopSec(3600)
    );
    expect(start).toMatchObject({
      enforcementId: "enf1",
      title: "Program Start (Block)",
      scheduleIndex: 1,
      remainingSec: 60,
    });

    const mid = resolveLivePreNoticeFromAxis(
      items,
      broadcastEpoch,
      totalDuration,
      nowAtLoopSec(3630)
    );
    expect(mid?.remainingSec).toBe(30);

    const nearEnd = resolveLivePreNoticeFromAxis(
      items,
      broadcastEpoch,
      totalDuration,
      nowAtLoopSec(3659)
    );
    expect(nearEnd?.remainingSec).toBe(1);
  });

  it("returns null during enforcement clip and post-notice slate", () => {
    expect(
      resolveLivePreNoticeFromAxis(
        items,
        broadcastEpoch,
        totalDuration,
        nowAtLoopSec(3660)
      )
    ).toBeNull();
    expect(
      resolveLivePreNoticeFromAxis(
        items,
        broadcastEpoch,
        totalDuration,
        nowAtLoopSec(3760)
      )
    ).toBeNull();
  });
});
