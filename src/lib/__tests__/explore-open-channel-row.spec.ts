import { describe, expect, it } from "vitest";

import { mergeExploreChannelRows } from "@/lib/explore-channel-row-merge";

describe("mergeExploreChannelRows", () => {
  it("merges nested event fields with API values winning", () => {
    const merged = mergeExploreChannelRows(
      {
        id: "ch-1",
        url: "https://youtube.com/watch?v=api",
        event: {
          id: "ev-1",
          amountToRaise: 500,
          amountRaised: 120,
          showViewCountOnVideos: true,
        },
      },
      {
        id: "ch-1",
        title: "Discover title",
        url: "https://youtube.com/watch?v=discover",
        event: {
          id: "ev-1",
          numOfTips: 3,
        },
      }
    );

    expect(merged.title).toBe("Discover title");
    expect(merged.url).toBe("https://youtube.com/watch?v=api");
    expect(merged.event).toEqual({
      id: "ev-1",
      numOfTips: 3,
      amountToRaise: 500,
      amountRaised: 120,
      showViewCountOnVideos: true,
    });
  });
});
