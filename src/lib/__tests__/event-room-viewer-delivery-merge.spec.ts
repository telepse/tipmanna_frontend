import { describe, expect, it } from "vitest";

import {
  mergeDefaultChannelRealtimeUpdate,
  mergePolledEventRoomChannels,
} from "../event-room-viewer-delivery-merge";

describe("event-room viewer delivery merge", () => {
  it("updates default channel url for viewer already open before Start", () => {
    const prev = [
      {
        id: "ch-native",
        url: "youtube:videoId:PriorVod",
        isDefault: true,
        mediaSource: "native" as const,
      },
      {
        id: "ch-linked",
        url: "https://www.youtube.com/watch?v=linked",
        isDefault: false,
        mediaSource: "linked" as const,
      },
    ];
    const next = mergeDefaultChannelRealtimeUpdate(prev, {
      channelId: "ch-native",
      url: "https://www.youtube.com/watch?v=liveId",
    });
    expect(next.find(c => c.id === "ch-native")?.url).toBe(
      "https://www.youtube.com/watch?v=liveId"
    );
    expect(next.find(c => c.id === "ch-linked")?.url).toBe(
      "https://www.youtube.com/watch?v=linked"
    );
  });

  it("poll merge refreshes url for newly opened viewer path", () => {
    const prev = [
      {
        id: "ch-native",
        url: "youtube:videoId:PriorVod",
        isDefault: true,
      },
    ];
    const next = mergePolledEventRoomChannels(prev, [
      {
        id: "ch-native",
        url: "https://www.youtube.com/watch?v=liveId",
        isDefault: true,
      },
    ]);
    expect(next[0]?.url).toBe("https://www.youtube.com/watch?v=liveId");
  });

  it("poll merge preserves linked channels not in poll payload", () => {
    const prev = [
      { id: "a", url: "u1", isDefault: false },
      { id: "b", url: "u2", isDefault: true },
    ];
    const next = mergePolledEventRoomChannels(prev, [
      { id: "b", url: "u2-live", isDefault: true },
    ]);
    expect(next).toHaveLength(2);
    expect(next.find(c => c.id === "a")?.url).toBe("u1");
  });
});
