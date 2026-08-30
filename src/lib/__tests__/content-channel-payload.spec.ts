import { describe, expect, it } from "vitest";

import {
  mergeEventRoomChannel,
  unwrapContentChannelList,
} from "@/lib/content-channel-payload";

describe("unwrapContentChannelList", () => {
  it("returns array payload as-is", () => {
    const rows = [{ id: "a" }, { id: "b" }];
    expect(unwrapContentChannelList(rows)).toEqual(rows);
  });

  it("unwraps formattedContents object", () => {
    const rows = [{ id: "ch-1", title: "One" }];
    expect(
      unwrapContentChannelList({
        formattedContents: rows,
        eventId: "ev-1",
      })
    ).toEqual(rows);
  });

  it("returns empty array for invalid payload", () => {
    expect(unwrapContentChannelList(null)).toEqual([]);
    expect(unwrapContentChannelList({})).toEqual([]);
    expect(unwrapContentChannelList({ formattedContents: "nope" })).toEqual([]);
  });
});

describe("mergeEventRoomChannel", () => {
  it("replaces an existing row by id", () => {
    const list = [{ id: "1", title: "Old" }];
    expect(mergeEventRoomChannel(list, { id: "1", title: "New" })).toEqual([
      { id: "1", title: "New" },
    ]);
  });

  it("appends when id is new", () => {
    const list = [{ id: "1", title: "One" }];
    expect(mergeEventRoomChannel(list, { id: "2", title: "Two" })).toEqual([
      { id: "1", title: "One" },
      { id: "2", title: "Two" },
    ]);
  });
});
