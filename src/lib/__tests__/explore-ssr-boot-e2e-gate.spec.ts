import { afterEach, describe, expect, it, vi } from "vitest";

import { E2E_FEED_BOOT } from "../e2e-explore-fixtures";
import { resolveExploreSsrBoot } from "../explore-ssr-boot";

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
const ORIGINAL_API = process.env.NEXT_PUBLIC_BACKEND_API_URL;

describe("resolveExploreSsrBoot E2E gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES = ORIGINAL_ENV;
    }
    if (ORIGINAL_API === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_API_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_API_URL = ORIGINAL_API;
    }
  });

  it("returns synthetic boot when dual gate is active without calling backend", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const boot = await resolveExploreSsrBoot("e2e=1");

    expect(boot).toEqual(E2E_FEED_BOOT);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses live fetch when query flag is absent even if env is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    process.env.NEXT_PUBLIC_BACKEND_API_URL = "http://api.test/api/v1";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ id: "live-1", title: "Live", url: "https://youtu.be/x" }],
        seed: "live",
        bucketId: 1,
      }),
    } as Response);

    const boot = await resolveExploreSsrBoot("feedTab=trends");

    expect(boot?.items[0]?.id).toBe("live-1");
  });
});
