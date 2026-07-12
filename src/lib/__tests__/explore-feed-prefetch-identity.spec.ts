import { describe, expect, it, vi } from "vitest";

vi.mock("@/actions/contents", () => ({
  postExploreFeedBatchAction: vi.fn(),
}));

import { takeExploreFeedBoot } from "../explore-feed-prefetch-cache";

describe("takeExploreFeedBoot identity guard", () => {
  it("refuses global trends boot for scoped community trends", () => {
    const boot = takeExploreFeedBoot({
      feedMode: "trends",
      identity: {
        feedMode: "trends",
        communityIds: ["c1"],
        trendsFilters: { eventTypes: [], language: "", country: "" },
      },
    });
    expect(boot.items).toEqual([]);
    expect(boot.seed).toBeUndefined();
  });

  it("refuses global trends boot for filtered trends", () => {
    const boot = takeExploreFeedBoot({
      feedMode: "trends",
      identity: {
        feedMode: "trends",
        trendsFilters: {
          eventTypes: ["music"],
          language: "",
          country: "",
        },
      },
    });
    expect(boot.items).toEqual([]);
    expect(boot.seed).toBeUndefined();
  });
});
