import { describe, expect, it } from "vitest";

import { parseApprovedHostEventsForPicker } from "@/lib/parse-host-events";

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
