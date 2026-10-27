import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

describe("deploy-info explore E2E fixtures diagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not claim client bundle substantiated from server env alone", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    const res = await GET();
    const body = await res.json();
    expect(body.exploreE2eFixtures.serverRuntimeEnvEnabled).toBe(true);
    expect(body.exploreE2eFixtures.clientBundleSubstantiated).toBe(false);
    expect(body.exploreE2eFixturesBuild).toBe(true);
  });

  it("server env false when compile-time public env unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "");
    const res = await GET();
    const body = await res.json();
    expect(body.exploreE2eFixtures.serverRuntimeEnvEnabled).toBe(false);
  });
});
