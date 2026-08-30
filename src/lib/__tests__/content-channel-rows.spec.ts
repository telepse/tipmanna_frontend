import { describe, expect, it } from "vitest";

import { unwrapContentChannelRows } from "@/lib/content-channel-rows";

describe("unwrapContentChannelRows", () => {
  it("returns array payload as-is", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    expect(unwrapContentChannelRows(rows)).toEqual(rows);
  });

  it("unwraps formattedContents object", () => {
    const rows = [{ id: "ch-1", title: "One" }];
    expect(
      unwrapContentChannelRows({
        formattedContents: rows,
        eventId: "ev-1",
      })
    ).toEqual(rows);
  });

  it("returns empty array for invalid payload", () => {
    expect(unwrapContentChannelRows(null)).toEqual([]);
    expect(unwrapContentChannelRows({})).toEqual([]);
    expect(unwrapContentChannelRows({ formattedContents: "nope" })).toEqual([]);
  });
});
