import { describe, expect, it } from "vitest";

import {
  resolveBroadcastPosition,
  TV_HALF_DAY_SECONDS,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";

const epoch = 0;

function positionAtLoop(
  items: ScheduleItem[],
  loopPosition: number,
  totalDuration = TV_HALF_DAY_SECONDS
) {
  return resolveBroadcastPosition(
    items,
    epoch,
    totalDuration,
    loopPosition * 1000
  );
}

function abFixture(): ScheduleItem[] {
  return [
    {
      id: "a",
      duration: 3600,
      axisStartSec: 0,
      axisEndSec: 3600,
      seekBaseSeconds: 0,
      channel: { url: "https://youtube.com/watch?v=a" },
    },
    {
      id: "b",
      duration: 3200,
      axisStartSec: 4000,
      axisEndSec: 7200,
      seekBaseSeconds: 0,
      channel: { url: "https://youtube.com/watch?v=b" },
    },
  ];
}

describe("§8c axis resolver (G8)", () => {
  it("G8-A — normal axis containment", () => {
    const pos = positionAtLoop(abFixture(), 1800);
    expect(pos.scheduleIndex).toBe(0);
    expect(pos.item?.id).toBe("a");
    expect(pos.offsetSeconds).toBe(1800);
  });

  it("G8-B — axis gap joins next row at seekBase (not packed fallback)", () => {
    const pos = positionAtLoop(abFixture(), 3800);
    expect(pos.scheduleIndex).toBe(1);
    expect(pos.item?.id).toBe("b");
    expect(pos.offsetSeconds).toBe(0);
    expect(pos.offsetSeconds).not.toBe(200);
  });

  it("G8-C — after final axis row end-caps last row (no wrap to first)", () => {
    const pos = positionAtLoop(abFixture(), 7300);
    expect(pos.scheduleIndex).toBe(1);
    expect(pos.item?.id).toBe("b");
    expect(pos.offsetSeconds).toBe(3199);
    expect(pos.scheduleIndex).not.toBe(0);
  });

  it("axis boundary — in-window offset advances (no end-cap)", () => {
    const start = 6000;
    const span = 687;
    const items: ScheduleItem[] = [
      {
        id: "row-n",
        duration: span,
        axisStartSec: start,
        axisEndSec: start + span,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=n" },
      },
      {
        id: "row-n1",
        duration: 1000,
        axisStartSec: start + span,
        axisEndSec: start + span + 1000,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=n1" },
      },
    ];
    const loopPosition = start + 680;
    const pos = positionAtLoop(items, loopPosition);
    expect(pos.scheduleIndex).toBe(0);
    expect(pos.offsetSeconds).toBe(680);
    expect(pos.offsetSeconds).not.toBe(686);
  });

  it("axis boundary — past row N end with successor returns row N+1 (not N end-cap 686)", () => {
    const start = 6000;
    const span = 687;
    const endCap = span - 1;
    expect(endCap).toBe(686);
    const items: ScheduleItem[] = [
      {
        id: "row-n",
        duration: span,
        axisStartSec: start,
        axisEndSec: start + span,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=P4kFofLwPLY" },
      },
      {
        id: "row-n1",
        duration: 1000,
        axisStartSec: start + span,
        axisEndSec: start + span + 1000,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=next" },
      },
    ];
    const loopPosition = start + 714;
    const pos = positionAtLoop(items, loopPosition);
    expect(pos.scheduleIndex).toBe(1);
    expect(pos.item?.id).toBe("row-n1");
    expect(pos.offsetSeconds).toBe(714 - span);
    expect(pos.scheduleIndex).not.toBe(0);
    expect(pos.offsetSeconds).not.toBe(686);
  });

  it("axis boundary — past end with non-axis filler still joins next axis row", () => {
    const start = 6000;
    const span = 687;
    const items: ScheduleItem[] = [
      {
        id: "row-n",
        duration: span,
        axisStartSec: start,
        axisEndSec: start + span,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=n" },
      },
      {
        id: "filler",
        duration: 100,
        seekBaseSeconds: 50,
        channel: { url: "https://youtube.com/watch?v=filler" },
      },
      {
        id: "row-m",
        duration: 500,
        axisStartSec: start + span + 200,
        axisEndSec: start + span + 700,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=m" },
      },
    ];
    const loopPosition = start + span + 50;
    const pos = positionAtLoop(items, loopPosition);
    expect(pos.scheduleIndex).toBe(2);
    expect(pos.offsetSeconds).toBe(0);
    expect(pos.scheduleIndex).not.toBe(0);
    expect(pos.offsetSeconds).not.toBe(686);
  });

  it("axis boundary — runtime-style: actual 714+ must not resolve to row N @ 686 when N+1 exists", () => {
    const start = 6000;
    const span = 687;
    const items: ScheduleItem[] = [
      {
        id: "row-20",
        duration: span,
        axisStartSec: start,
        axisEndSec: start + span,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=P4kFofLwPLY" },
      },
      {
        id: "row-21",
        duration: 2000,
        axisStartSec: start + span,
        axisEndSec: start + span + 2000,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=after" },
      },
    ];
    for (const loopPosition of [start + 693, start + 714, start + 745]) {
      const pos = positionAtLoop(items, loopPosition);
      expect(pos.scheduleIndex).toBe(1);
      expect(pos.offsetSeconds).toBe(loopPosition - (start + span));
      expect(pos.offsetSeconds).not.toBe(686);
    }
  });

  it("G8-D — no axis uses packed-duration behavior", () => {
    const items: ScheduleItem[] = [
      {
        id: "x",
        duration: 3600,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=x" },
      },
      {
        id: "y",
        duration: 3600,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=y" },
      },
    ];
    const pos = positionAtLoop(items, 4500);
    expect(pos.scheduleIndex).toBe(1);
    expect(pos.offsetSeconds).toBe(900);
  });
});
