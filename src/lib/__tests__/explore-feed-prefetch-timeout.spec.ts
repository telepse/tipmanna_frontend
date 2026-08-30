import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/actions/contents", () => ({
  postExploreFeedBatchAction: vi.fn(),
}));

import { postExploreFeedBatchAction } from "@/actions/contents";
import {
  prefetchExploreFeedInitial,
  waitExploreFeedPrefetch,
} from "../explore-feed-prefetch-cache";
import { EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS } from "../explore-feed-fetch-timeout";

describe("waitExploreFeedPrefetch timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("fail-opens when inflight prefetch exceeds wait timeout", async () => {
    vi.mocked(postExploreFeedBatchAction).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    prefetchExploreFeedInitial();

    const waitP = waitExploreFeedPrefetch({ feedMode: "trends" });
    await vi.advanceTimersByTimeAsync(
      EXPLORE_FEED_PREFETCH_WAIT_TIMEOUT_MS + 100
    );

    await expect(waitP).resolves.toBeNull();
  });
});
