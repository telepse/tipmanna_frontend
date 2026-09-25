import { describe, expect, it } from "vitest";

import {
  resolveLiveTvEventIdFromSchedule,
  resolveLiveTvScheduleIndex,
} from "@/lib/tv-ssr-live-tip-catalog";

describe("tv-ssr-live-tip-catalog", () => {
  const body = {
    livePosition: { scheduleIndex: 1 },
    items: [
      { channel: { eventId: "event-a" } },
      { defaultChannelEventId: "event-b" },
      { defaultChannelEventId: "event-c" },
    ],
  };

  it("uses livePosition.scheduleIndex when present", () => {
    expect(resolveLiveTvScheduleIndex(body)).toBe(1);
  });

  it("defaults live index to 0", () => {
    expect(resolveLiveTvScheduleIndex({ items: body.items })).toBe(0);
  });

  it("resolves event id for the live row", () => {
    expect(resolveLiveTvEventIdFromSchedule(body)).toBe("event-b");
  });

  it("returns empty when schedule has no items", () => {
    expect(resolveLiveTvEventIdFromSchedule({ items: [] })).toBe("");
  });
});
