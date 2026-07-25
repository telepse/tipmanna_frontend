import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getFetchDedupCoalesceCount,
  resetFetchDedupCoalesceCount,
  runServerFetch,
} from "../action-fetch";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("runServerFetch perAttemptTimeoutMs", () => {
  beforeEach(() => {
    resetFetchDedupCoalesceCount();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("creates a fresh non-aborted signal on each retry after a timeout", async () => {
    let fetchCalls = 0;
    const abortedAtStart: boolean[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        abortedAtStart.push(Boolean(init?.signal?.aborted));
        if (fetchCalls === 1) {
          throw new DOMException("The operation was aborted.", "AbortError");
        }
        return jsonResponse({ ok: true });
      })
    );

    const result = await runServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: "{}",
        perAttemptTimeoutMs: 20_000,
      },
      "testFreshSignalRetry"
    );

    expect(result.success).toBe(true);
    expect(fetchCalls).toBe(2);
    expect(abortedAtStart).toEqual([false, false]);
  });

  it("succeeds when the response completes between 10s and 20s on attempt 0", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve(jsonResponse({ items: [{ id: "a" }], seed: "s" }));
          }, 12_000);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        });
      })
    );

    const resultPromise = runServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: '{"excludeChannelIds":["x"]}',
        perAttemptTimeoutMs: 20_000,
      },
      "testSlowPaginationSuccess"
    );

    await vi.advanceTimersByTimeAsync(12_000);
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("aborts attempt 0 at 10s but allows attempt 1 to run to completion", async () => {
    vi.useFakeTimers();

    let fetchCalls = 0;
    const abortedAtStart: boolean[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        abortedAtStart.push(Boolean(init?.signal?.aborted));
        return new Promise<Response>((resolve, reject) => {
          const delayMs = fetchCalls === 1 ? 12_000 : 2_000;
          const timer = setTimeout(() => {
            resolve(jsonResponse({ ok: true }));
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

    const resultPromise = runServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: "{}",
        perAttemptTimeoutMs: 10_000,
      },
      "testTenSecondPerAttempt"
    );

    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(400);
    await vi.advanceTimersByTimeAsync(2_000);
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(fetchCalls).toBe(2);
    expect(abortedAtStart).toEqual([false, false]);

    vi.useRealTimers();
  });

  it("coalesces duplicate in-flight requests with perAttemptTimeoutMs", async () => {
    let fetchCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        fetchCalls += 1;
        await new Promise(r => setTimeout(r, 20));
        return jsonResponse({ ok: true });
      })
    );

    const init = {
      method: "POST" as const,
      body: '{"excludeChannelIds":["a"]}',
      perAttemptTimeoutMs: 20_000,
    };

    const [a, b] = await Promise.all([
      runServerFetch("http://example.test/feed/batch", init, "dedupeA"),
      runServerFetch("http://example.test/feed/batch", init, "dedupeB"),
    ]);

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(fetchCalls).toBe(1);
    expect(getFetchDedupCoalesceCount()).toBe(1);
  });

  it("retries 5xx responses and preserves perAttemptTimeoutMs per attempt", async () => {
    let fetchCalls = 0;
    const abortedAtStart: boolean[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        fetchCalls += 1;
        abortedAtStart.push(Boolean(init?.signal?.aborted));
        if (fetchCalls === 1) {
          return jsonResponse({ message: "fail" }, 503);
        }
        return jsonResponse({ ok: true });
      })
    );

    const result = await runServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: "{}",
        perAttemptTimeoutMs: 20_000,
      },
      "testFiveOhThreeRetry"
    );

    expect(result.success).toBe(true);
    expect(fetchCalls).toBe(2);
    expect(abortedAtStart).toEqual([false, false]);
  });

  it("returns failure after exhausting retries when every attempt times out", async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
        });
      })
    );

    const resultPromise = runServerFetch(
      "http://example.test/feed/batch",
      {
        method: "POST",
        body: "{}",
        perAttemptTimeoutMs: 1_000,
      },
      "testExhaustedRetries"
    );

    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(400);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(800);
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1_600);
    await vi.advanceTimersByTimeAsync(1_000);

    const result = await resultPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");

    vi.useRealTimers();
  });
});
