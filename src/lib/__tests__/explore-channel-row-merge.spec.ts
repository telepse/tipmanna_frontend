import { describe, expect, it } from "vitest";

import {
  isExploreReelReadyRow,
  mergeExploreChannelRows,
} from "../explore-channel-row-merge";

describe("mergeExploreChannelRows", () => {
  it("preserves snapshot username while filling amountToRaise from API", () => {
    const merged = mergeExploreChannelRows(
      {
        event: { amountToRaise: 100, username: "host-a" },
        durationSeconds: 120,
      },
      {
        url: "https://youtube.com/watch?v=abc",
        event: { id: "ev-1", username: "host-a" },
        coOwnerHostUsername: "co-a",
      }
    );
    expect(merged.event).toMatchObject({
      id: "ev-1",
      username: "host-a",
      amountToRaise: 100,
    });
    expect(merged.coOwnerHostUsername).toBe("co-a");
    expect(merged.durationSeconds).toBe(120);
  });

  it("preserves coOwnerHostIsUnclaimed from secondary snapshot", () => {
    const merged = mergeExploreChannelRows(
      { event: { username: "host-a" } },
      {
        coOwnerHostUsername: "co-a",
        coOwnerHostIsUnclaimed: true,
        coOwnerName: "Alex Creator",
      }
    );
    expect(merged.coOwnerHostIsUnclaimed).toBe(true);
    expect(merged.coOwnerName).toBe("Alex Creator");
  });
});

describe("isExploreReelReadyRow", () => {
  it("requires host username and playable url", () => {
    expect(
      isExploreReelReadyRow({
        url: "https://youtube.com/watch?v=abc",
        event: { username: "creator" },
      })
    ).toBe(true);
    expect(
      isExploreReelReadyRow({
        url: "https://youtube.com/watch?v=abc",
        event: {},
      })
    ).toBe(false);
  });
});
