import { describe, expect, it } from "vitest";

import { resolveTvScheduleEventId } from "@/lib/resolve-tv-schedule-event-id";

describe("resolveTvScheduleEventId", () => {
  it("prefers channel.eventId over defaultChannelEventId", () => {
    expect(
      resolveTvScheduleEventId({
        channel: { eventId: "event-a" },
        defaultChannelEventId: "event-b",
      })
    ).toBe("event-a");
  });

  it("falls back to defaultChannelEventId", () => {
    expect(
      resolveTvScheduleEventId({
        channel: {},
        defaultChannelEventId: "event-b",
      })
    ).toBe("event-b");
  });

  it("returns empty string when missing", () => {
    expect(resolveTvScheduleEventId(null)).toBe("");
  });
});
