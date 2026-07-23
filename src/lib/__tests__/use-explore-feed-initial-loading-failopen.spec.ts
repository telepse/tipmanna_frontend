import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS } from "../explore-feed-fetch-timeout";
import { createInitialLoadingFailOpenTimer } from "../use-explore-feed-initial-loading-failopen";

describe("useExploreFeedInitialLoadingFailOpen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout: (...args: Parameters<typeof setTimeout>) =>
        setTimeout(...args),
      clearTimeout: (...args: Parameters<typeof clearTimeout>) =>
        clearTimeout(...args),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("timer starts while initialLoading is true", () => {
    const setInitialLoading = vi.fn();
    createInitialLoadingFailOpenTimer(setInitialLoading);
    vi.advanceTimersByTime(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS - 1);
    expect(setInitialLoading).not.toHaveBeenCalled();
  });

  it("fail-open activates after the expected threshold", () => {
    const setInitialLoading = vi.fn();
    createInitialLoadingFailOpenTimer(setInitialLoading);
    vi.advanceTimersByTime(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS);
    expect(setInitialLoading).toHaveBeenCalledTimes(1);
    expect(setInitialLoading).toHaveBeenCalledWith(false);
  });

  it("timer clears when loading finishes normally", () => {
    const setInitialLoading = vi.fn();
    const clear = createInitialLoadingFailOpenTimer(setInitialLoading);
    clear();
    vi.advanceTimersByTime(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS);
    expect(setInitialLoading).not.toHaveBeenCalled();
  });

  it("timer clears on unmount", () => {
    const setInitialLoading = vi.fn();
    const clear = createInitialLoadingFailOpenTimer(setInitialLoading);
    clear();
    vi.advanceTimersByTime(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS);
    expect(setInitialLoading).not.toHaveBeenCalled();
  });

  it("delayed Feed data can still render after fail-open", () => {
    let loading = true;
    const setInitialLoading = vi.fn((value: boolean) => {
      loading = value;
    });
    createInitialLoadingFailOpenTimer(setInitialLoading);
    vi.advanceTimersByTime(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS);
    expect(loading).toBe(false);
    loading = false;
    expect(loading).toBe(false);
  });

  it("does not permanently keep skeleton state after fail-open", () => {
    let loading = true;
    const setInitialLoading = vi.fn((value: boolean) => {
      loading = value;
    });
    createInitialLoadingFailOpenTimer(setInitialLoading);
    vi.advanceTimersByTime(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS);
    expect(loading).toBe(false);
  });
});
