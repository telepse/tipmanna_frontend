import { describe, expect, it, vi } from "vitest";

import {
  BOUNDED_PAGINATION_WORST_CASE_MS,
  LEGACY_PAGINATION_WORST_CASE_MS,
  runExplorePaginationServerFetch,
} from "../explore-feed-pagination-fetch";
import { resetFetchDedupCoalesceCount } from "../action-fetch";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("runExplorePaginationServerFetch bounded deadline", () => {
  it("documents legacy worst case above 60s", () => {
    expect(LEGACY_PAGINATION_WORST_CASE_MS).toBeGreaterThan(60_000);
  });

  it("caps worst case at the total pagination deadline", () => {
    expect(BOUNDED_PAGINATION_WORST_CASE_MS).toBe(35_000);
    expect(BOUNDED_PAGINATION_WORST_CASE_MS).toBeLessThan(40_000);
  });

  it("does not exceed total deadline when each attempt would otherwise time out at 25s", async () => {
    vi.useFakeTimers();
    resetFetchDedupCoalesceCount();

    let fetchCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        });
      })
    );

    const resultPromise = runExplorePaginationServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: '{"excludeChannelIds":["a"]}',
        perAttemptTimeoutMs: 25_000,
      },
      "testBoundedDeadline"
    );

    await vi.advanceTimersByTimeAsync(25_000);
    await vi.advanceTimersByTimeAsync(400);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(fetchCalls).toBeLessThanOrEqual(2);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("succeeds on first attempt when backend responds within per-attempt budget", async () => {
    resetFetchDedupCoalesceCount();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ items: [{ id: "1" }], seed: "s" }))
    );

    const result = await runExplorePaginationServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: '{"excludeChannelIds":["a"]}',
        perAttemptTimeoutMs: 25_000,
      },
      "testPaginationSuccess"
    );

    expect(result.success).toBe(true);
    vi.unstubAllGlobals();
  });
});
