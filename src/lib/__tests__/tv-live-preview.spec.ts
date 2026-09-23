import { describe, expect, it } from "vitest";

import {
  computeNoticeRemainingSec,
  parseTvSchedulePayload,
  resolveLivePreviewPlayback,
  shouldFollowLive,
  shouldIssuePreviewLoad,
  shouldSwitchPreviewItem,
} from "@/lib/tv-live-preview";
import type { ScheduleItem } from "@/lib/tv/broadcastResolver";

const epoch = 1_700_000_000_000;

function makeItem(
  id: string,
  duration: number,
  overrides: Partial<ScheduleItem> = {}
): ScheduleItem {
  return {
    id,
    duration,
    channel: { url: `https://www.youtube.com/watch?v=${id}` },
    segmentKind: "regular",
    ...overrides,
  };
}

describe("parseTvSchedulePayload", () => {
  it("reads totalDuration and livePosition from schedule body", () => {
    const parsed = parseTvSchedulePayload({
      items: [makeItem("a", 60)],
      broadcastEpoch: epoch,
      totalDuration: 3600,
      livePosition: { scheduleIndex: 0, offsetSeconds: 12 },
    });
    expect(parsed.totalDuration).toBe(3600);
    expect(parsed.broadcastEpoch).toBe(epoch);
    expect(parsed.livePosition?.scheduleIndex).toBe(0);
    expect(parsed.livePosition?.offsetSeconds).toBe(12);
  });
});

describe("resolveLivePreviewPlayback", () => {
  it("prefers server livePosition on first paint", () => {
    const items = [makeItem("vid1", 120), makeItem("vid2", 120)];
    const now = epoch + 30_000;
    const playback = resolveLivePreviewPlayback(items, epoch, 240, now, {
      scheduleIndex: 1,
      offsetSeconds: 5,
      loopPosition: 125,
    });
    expect(playback?.scheduleIndex).toBe(1);
    expect(playback?.offsetSeconds).toBe(5);
    expect(playback?.item?.id).toBe("vid2");
  });

  it("falls back to resolveBroadcastPosition when livePosition is absent", () => {
    const items = [
      makeItem("vid1", 60, { axisStartSec: 0, axisEndSec: 60 }),
      makeItem("vid2", 60, { axisStartSec: 60, axisEndSec: 120 }),
    ];
    const now = epoch + 90_000;
    const playback = resolveLivePreviewPlayback(items, epoch, 120, now, null);
    expect(playback?.scheduleIndex).toBe(1);
    expect(playback?.offsetSeconds).toBeGreaterThanOrEqual(0);
  });

  it("uses wall clock when livePosition is null (Back to Live)", () => {
    const items = [
      makeItem("vid1", 60, { axisStartSec: 0, axisEndSec: 60 }),
      makeItem("vid2", 60, { axisStartSec: 60, axisEndSec: 120 }),
    ];
    const staleServer = {
      scheduleIndex: 0,
      offsetSeconds: 10,
      loopPosition: 10,
    };
    const now = epoch + 90_000;
    const playback = resolveLivePreviewPlayback(items, epoch, 120, now, null);
    expect(playback?.scheduleIndex).toBe(1);
    expect(playback?.offsetSeconds).toBe(30);
    expect(playback?.scheduleIndex).not.toBe(staleServer.scheduleIndex);
  });
});

describe("shouldFollowLive / shouldSwitchPreviewItem", () => {
  it("GLOBAL follows live index changes", () => {
    expect(shouldFollowLive("GLOBAL")).toBe(true);
    expect(
      shouldSwitchPreviewItem({
        mode: "GLOBAL",
        liveScheduleIndex: 2,
        loadedScheduleIndex: 1,
        liveVideoId: "a",
        loadedVideoId: "a",
      })
    ).toBe(true);
  });

  it("LOCAL ignores live index changes", () => {
    expect(shouldFollowLive("LOCAL")).toBe(false);
    expect(
      shouldSwitchPreviewItem({
        mode: "LOCAL",
        liveScheduleIndex: 2,
        loadedScheduleIndex: 1,
        liveVideoId: "b",
        loadedVideoId: "a",
      })
    ).toBe(false);
  });
});

describe("shouldIssuePreviewLoad", () => {
  it("defers load until embed is established", () => {
    expect(
      shouldIssuePreviewLoad({
        force: true,
        embedEstablished: false,
        shouldSwitch: true,
      })
    ).toBe(false);
  });

  it("forces load after embed (Back to Live)", () => {
    expect(
      shouldIssuePreviewLoad({
        force: true,
        embedEstablished: true,
        shouldSwitch: false,
      })
    ).toBe(true);
  });

  it("loads only on switch when not forced", () => {
    expect(
      shouldIssuePreviewLoad({
        force: false,
        embedEstablished: true,
        shouldSwitch: false,
      })
    ).toBe(false);
    expect(
      shouldIssuePreviewLoad({
        force: false,
        embedEstablished: true,
        shouldSwitch: true,
      })
    ).toBe(true);
  });
});

describe("computeNoticeRemainingSec", () => {
  it("returns seconds until notice axis end", () => {
    const notice = makeItem("notice", 60, {
      segmentKind: "notice",
      axisStartSec: 100,
      axisEndSec: 160,
      blockTitle: "Coming up",
    });
    expect(computeNoticeRemainingSec(notice, 130)).toBe(30);
  });
});
