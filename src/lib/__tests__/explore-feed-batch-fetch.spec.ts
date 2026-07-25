import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS } from "../explore-feed-fetch-timeout";

vi.mock("@/lib/server-auth", () => ({
  serverAuthHeaders: vi.fn(async () => ({
    "Content-Type": "application/json",
  })),
}));

import { postExploreFeedBatchAction } from "@/actions/contents";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("postExploreFeedBatchAction fetch timeouts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "http://api.test";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("uses 10s per-attempt timeout for boot requests with no excludes", async () => {
    vi.useFakeTimers();
    let fetchCalls = 0;
    const abortedAtStart: boolean[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        abortedAtStart.push(Boolean(init?.signal?.aborted));
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        });
      })
    );

    const resultPromise = postExploreFeedBatchAction([], undefined, 8);
    await vi.advanceTimersByTimeAsync(EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS);
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchCalls).toBeGreaterThanOrEqual(2);
    expect(abortedAtStart.every(v => v === false)).toBe(true);

    await vi.advanceTimersByTimeAsync(60_000);
    const result = await resultPromise;
    expect(result.success).toBe(false);

    vi.useRealTimers();
  });

  it("uses 20s per-attempt timeout for pagination requests with excludes", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          const delayMs = EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS + 2_000;
          const timer = setTimeout(() => {
            resolve(
              jsonResponse({
                items: [{ id: "next" }],
                seed: "s",
              })
            );
          }, delayMs);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        });
      })
    );

    const resultPromise = postExploreFeedBatchAction(
      ["existing-id"],
      "seed-1",
      6
    );
    await vi.advanceTimersByTimeAsync(
      EXPLORE_FEED_CLIENT_FETCH_TIMEOUT_MS + 2_000
    );
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data?.items).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("completes pagination between 10s and 20s without a second backend cycle", async () => {
    vi.useFakeTimers();
    let fetchCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve(
              jsonResponse({
                items: [{ id: "a" }, { id: "b" }],
                seed: "seed-2",
              })
            );
          }, 13_800);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        });
      })
    );

    const resultPromise = postExploreFeedBatchAction(
      ["id-1", "id-2"],
      "seed-1",
      6
    );
    await vi.advanceTimersByTimeAsync(13_800);
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(fetchCalls).toBe(1);
    expect(result.data?.items).toHaveLength(2);

    vi.useRealTimers();
  });
});
