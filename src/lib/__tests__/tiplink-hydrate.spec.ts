import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchPublicTipLinkHydrate } from "@/lib/tiplink-hydrate";

describe("fetchPublicTipLinkHydrate", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "http://api.test/api/v1";
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_API_URL = originalEnv;
    }
    vi.useRealTimers();
  });

  it("returns null when API base is missing", async () => {
    delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
    await expect(fetchPublicTipLinkHydrate("slug")).resolves.toBeNull();
  });

  it("retries once after a transient failure", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          characterSets: [{ id: "s1", name: "General", characters: [] }],
          metrics: { saves: 0, shares: 0, encounters: 0, comments: 0 },
        }),
      }) as typeof fetch;

    const promise = fetchPublicTipLinkHydrate("my-slug");
    await vi.runAllTimersAsync();
    const data = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(data?.characterSets).toHaveLength(1);
  });
});
