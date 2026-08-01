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

  it("uses exactly one fetch attempt per pagination cycle on timeout", async () => {
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
        perAttemptTimeoutMs: 35_000,
      },
      "testBoundedDeadline"
    );

    await vi.advanceTimersByTimeAsync(35_000);
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(fetchCalls).toBe(1);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  }, 15_000);

  it("succeeds on first attempt when backend responds within per-attempt budget", async () => {
    resetFetchDedupCoalesceCount();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ items: [{ id: "1" }], seed: "s" }, 200))
    );

    const result = await runExplorePaginationServerFetch(
      "http://example.test/feed/batch-unique-success",
      {
        method: "POST",
        body: '{"excludeChannelIds":["b"]}',
        perAttemptTimeoutMs: 25_000,
      },
      "testPaginationSuccess"
    );

    expect(result.success).toBe(true);
    vi.unstubAllGlobals();
  });
});
