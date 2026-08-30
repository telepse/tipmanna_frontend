import { describe, expect, it } from "vitest";

import { mapApiChannelToEventRoomRow } from "@/lib/event-room-channel-mapper";

describe("mapApiChannelToEventRoomRow", () => {
  it("maps a valid API row", () => {
    expect(
      mapApiChannelToEventRoomRow({
        id: "ch-1",
        url: "https://youtube.com/watch?v=abc",
        title: "My video",
        isDefault: true,
        durationSeconds: 120,
      })
    ).toEqual({
      id: "ch-1",
      url: "https://youtube.com/watch?v=abc",
      title: "My video",
      isDefault: true,
      durationSeconds: 120,
    });
  });

  it("returns null when id or url is missing", () => {
    expect(mapApiChannelToEventRoomRow(null)).toBeNull();
    expect(mapApiChannelToEventRoomRow({ id: "1" })).toBeNull();
    expect(mapApiChannelToEventRoomRow({ url: "https://x" })).toBeNull();
  });
});
