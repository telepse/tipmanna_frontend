import { afterEach, describe, expect, it, vi } from "vitest";

import { EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR } from "../explore-e2e-fixtures-gate";

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;

describe("E2E fixtures build sentinel (client bundle substantiation)", () => {
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES = ORIGINAL_ENV;
    }
    vi.unstubAllEnvs();
  });

  it("sentinel matches anchor when build flag on", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    vi.resetModules();
    const mod = await import("../e2e-explore-fixtures");
    expect(mod.E2E_FIXTURES_BUILD_SENTINEL).toBe(
      EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR
    );
  });

  it("sentinel null when build flag off", async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    vi.resetModules();
    const mod = await import("../e2e-explore-fixtures");
    expect(mod.E2E_FIXTURES_BUILD_SENTINEL).toBeNull();
  });
});
