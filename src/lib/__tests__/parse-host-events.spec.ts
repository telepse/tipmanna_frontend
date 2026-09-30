import { describe, expect, it } from "vitest";

import {
  parseApprovedHostEventsForPicker,
  parseHostEventsEligibleForCommunity,
} from "@/lib/parse-host-events";

describe("parseApprovedHostEventsForPicker", () => {
  it("unwraps paginated data and keeps approved only", () => {
    const raw = {
      data: [
        { id: "e1", eventName: "Live Night", approved: true },
        { id: "e2", eventName: "Pending", approved: false },
        { id: "e3", approved: true },
      ],
      pagination: { page: 1, limit: 100, total: 3, totalPages: 1 },
    };
    expect(parseApprovedHostEventsForPicker(raw)).toEqual([
      { id: "e1", eventName: "Live Night" },
      { id: "e3", eventName: "Event" },
    ]);
  });

  it("accepts bare array", () => {
    expect(
      parseApprovedHostEventsForPicker([
        { id: "a", eventName: "A", approved: true },
      ])
    ).toEqual([{ id: "a", eventName: "A" }]);
  });

  it("accepts events wrapper", () => {
    expect(
      parseApprovedHostEventsForPicker({
        events: [{ id: "b", eventName: "B", approved: true }],
      })
    ).toEqual([{ id: "b", eventName: "B" }]);
  });

  it("returns empty for null or unknown shape", () => {
    expect(parseApprovedHostEventsForPicker(null)).toEqual([]);
    expect(parseApprovedHostEventsForPicker({ foo: [] })).toEqual([]);
  });
});

describe("parseHostEventsEligibleForCommunity", () => {
  it("keeps approved eligible unlinked rooms only", () => {
    const raw = [
      {
        id: "ok",
        eventName: "Room",
        submissionKind: "event_only",
        approved: true,
        rejected: false,
      },
      {
        id: "pending",
        eventName: "Wait",
        submissionKind: "event_only",
        approved: false,
      },
      {
        id: "linked",
        eventName: "Used",
        submissionKind: "event_only",
        approved: true,
        communityId: "c1",
      },
      {
        id: "content",
        eventName: "Content",
        submissionKind: "content_only",
        approved: true,
      },
    ];
    expect(parseHostEventsEligibleForCommunity(raw)).toEqual([
      { id: "ok", eventName: "Room" },
    ]);
  });
});
