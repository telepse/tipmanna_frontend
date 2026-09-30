import { describe, expect, it } from "vitest";

import { tvScheduleSessionCacheKey } from "@/lib/tv-single-startup-schedule";
import {
  normalizeTvCommunitySearchParam,
  resolveLiveTvEventIdFromSchedule,
  resolveLiveTvScheduleIndex,
  sameTvSsrSource,
  shouldAllowSsrTvTipPendingInitial,
  shouldPersistSsrTvScheduleBootstrap,
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

describe("TV SSR source tagging", () => {
  it("normalizes community search params from the URL only", () => {
    expect(normalizeTvCommunitySearchParam("  comm-1  ")).toBe("comm-1");
    expect(normalizeTvCommunitySearchParam("")).toBeNull();
    expect(normalizeTvCommunitySearchParam(undefined)).toBeNull();
    expect(normalizeTvCommunitySearchParam(null)).toBeNull();
  });

  it("treats missing community ids as the same global source", () => {
    expect(sameTvSsrSource(null, undefined)).toBe(true);
    expect(sameTvSsrSource("comm-1", "comm-1")).toBe(true);
    expect(sameTvSsrSource(null, "comm-1")).toBe(false);
    expect(sameTvSsrSource("comm-1", "comm-2")).toBe(false);
  });

  it("allows pending initial only when items are empty and sources match", () => {
    expect(
      shouldAllowSsrTvTipPendingInitial({
        scheduleItemsEmpty: true,
        bootstrapCommunityId: null,
        scheduleSourceCommunityId: null,
      })
    ).toBe(true);
    expect(
      shouldAllowSsrTvTipPendingInitial({
        scheduleItemsEmpty: true,
        bootstrapCommunityId: "comm-1",
        scheduleSourceCommunityId: "comm-1",
      })
    ).toBe(true);
    expect(
      shouldAllowSsrTvTipPendingInitial({
        scheduleItemsEmpty: true,
        bootstrapCommunityId: null,
        scheduleSourceCommunityId: "comm-1",
      })
    ).toBe(false);
    expect(
      shouldAllowSsrTvTipPendingInitial({
        scheduleItemsEmpty: false,
        bootstrapCommunityId: "comm-1",
        scheduleSourceCommunityId: "comm-1",
      })
    ).toBe(false);
  });

  it("persists SSR schedule only on source match and under that source key", () => {
    expect(
      shouldPersistSsrTvScheduleBootstrap({
        hasBody: true,
        bootstrapCommunityId: "comm-1",
        scheduleSourceCommunityId: "comm-1",
      })
    ).toBe(true);
    expect(
      shouldPersistSsrTvScheduleBootstrap({
        hasBody: true,
        bootstrapCommunityId: "comm-1",
        scheduleSourceCommunityId: null,
      })
    ).toBe(false);
    expect(
      shouldPersistSsrTvScheduleBootstrap({
        hasBody: false,
        bootstrapCommunityId: null,
        scheduleSourceCommunityId: null,
      })
    ).toBe(false);
    expect(tvScheduleSessionCacheKey(null)).toBe("tipmanna-tv-schedule-v2");
    expect(tvScheduleSessionCacheKey("comm-1")).toBe(
      "tipmanna-tv-schedule-v2-c/comm-1"
    );
    expect(tvScheduleSessionCacheKey("comm-1")).not.toBe(
      tvScheduleSessionCacheKey(null)
    );
  });
});
