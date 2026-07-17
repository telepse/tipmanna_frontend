import { describe, expect, it } from "vitest";

import {
  computePaginationBackoffMs,
  isConfirmedFeedExhaustion,
  isDuplicateOnlyBatch,
  mergeBatchDedup,
} from "../explore-feed-pagination-policy";

describe("explore-feed-pagination-policy", () => {
  it("computes capped exponential backoff", () => {
    expect(computePaginationBackoffMs(1)).toBe(1_000);
    expect(computePaginationBackoffMs(2)).toBe(2_000);
    expect(computePaginationBackoffMs(5)).toBe(16_000);
    expect(computePaginationBackoffMs(10)).toBe(30_000);
  });

  it("merges batch with dedup", () => {
    const prev = [{ id: "a" }, { id: "b" }];
    const { items, newCount } = mergeBatchDedup(prev, [
      { id: "b" },
      { id: "c" },
    ]);
    expect(newCount).toBe(1);
    expect(items.map(x => x.id)).toEqual(["a", "b", "c"]);
  });

  it("detects duplicate-only batch", () => {
    const prev = [{ id: "a" }, { id: "b" }];
    expect(isDuplicateOnlyBatch(prev, [{ id: "a" }, { id: "b" }])).toBe(true);
    expect(isDuplicateOnlyBatch(prev, [{ id: "c" }])).toBe(false);
  });

  it("exhaustion only on confirmed empty batch", () => {
    expect(
      isConfirmedFeedExhaustion({
        batchLength: 0,
        feedMode: "trends",
        hadExcludeIds: true,
      })
    ).toBe(true);
    expect(
      isConfirmedFeedExhaustion({
        batchLength: 0,
        feedMode: "saves",
        hadExcludeIds: true,
      })
    ).toBe(false);
  });
});
