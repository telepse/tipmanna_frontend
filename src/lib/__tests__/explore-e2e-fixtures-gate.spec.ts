import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR,
  exploreE2eFixturesClientBuildAnchor,
  isExploreE2eFixturesEnabled,
  isExploreE2eFixturesEnvEnabled,
} from "../explore-e2e-fixtures-gate";

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;

describe("explore E2E fixtures gate", () => {
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES = ORIGINAL_ENV;
    }
    vi.unstubAllEnvs();
  });

  it("query flag absent + env enabled → fixtures off", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    expect(isExploreE2eFixturesEnabled(new URLSearchParams())).toBe(false);
    expect(isExploreE2eFixturesEnabled("tab=feed")).toBe(false);
  });

  it("query flag present + env disabled → fixtures off", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    expect(isExploreE2eFixturesEnabled(new URLSearchParams("e2e=1"))).toBe(
      false
    );
  });

  it("query flag present + env enabled → fixtures on", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    expect(isExploreE2eFixturesEnabled(new URLSearchParams("e2e=1"))).toBe(
      true
    );
    expect(isExploreE2eFixturesEnabled("tab=feed&e2e=1")).toBe(true);
  });

  it("query flag absent + env disabled → fixtures off", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    expect(isExploreE2eFixturesEnabled(new URLSearchParams())).toBe(false);
    expect(isExploreE2eFixturesEnvEnabled()).toBe(false);
  });

  it("client build anchor null when env off", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES;
    expect(exploreE2eFixturesClientBuildAnchor()).toBeNull();
  });

  it("client build anchor set when env on", () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES", "1");
    expect(exploreE2eFixturesClientBuildAnchor()).toBe(
      EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR
    );
  });
});
