import { describe, expect, it } from "vitest";

import {
  resolveBroadcastPosition,
  TV_HALF_DAY_SECONDS,
} from "./broadcastResolver";

describe("resolveBroadcastPosition", () => {
  const epoch = Date.UTC(2024, 0, 1, 0, 0, 0);

  it("joins mid-segment using axis coordinates after filtered gaps", () => {
    const items = [
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
        duration: 3600,
        axisStartSec: 3600,
        axisEndSec: 7200,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=b" },
      },
    ];

    const now = epoch + (3600 + 900) * 1000;
    const pos = resolveBroadcastPosition(
      items,
      epoch,
      TV_HALF_DAY_SECONDS,
      now
    );

    expect(pos.scheduleIndex).toBe(1);
    expect(pos.offsetSeconds).toBe(900);
    expect(pos.loopPosition).toBe(4500);
  });

  it("loops within the 12h window using broadcast epoch", () => {
    const items = [
      {
        id: "a",
        duration: TV_HALF_DAY_SECONDS,
        axisStartSec: 0,
        axisEndSec: TV_HALF_DAY_SECONDS,
        seekBaseSeconds: 0,
        channel: { url: "https://youtube.com/watch?v=a" },
      },
    ];

    const now = epoch + (TV_HALF_DAY_SECONDS + 120) * 1000;
    const pos = resolveBroadcastPosition(
      items,
      epoch,
      TV_HALF_DAY_SECONDS,
      now
    );

    expect(pos.loopPosition).toBe(120);
    expect(pos.offsetSeconds).toBe(120);
    expect(pos.windowIndex).toBe(1);
  });
});
