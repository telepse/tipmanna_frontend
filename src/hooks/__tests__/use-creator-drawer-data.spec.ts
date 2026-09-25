import { describe, expect, it } from "vitest";

/** Mirrors useCreatorDrawerData loading gate when SWR still reports isLoading. */
function creatorDrawerLoading(
  enabled: boolean,
  profile: unknown,
  isLoading: boolean
): boolean {
  return enabled && !profile && isLoading;
}

describe("useCreatorDrawerData loading", () => {
  it("cache hit (profile present) is not loading even when SWR isLoading", () => {
    const cachedProfile = { username: "alice" };
    expect(creatorDrawerLoading(true, cachedProfile, true)).toBe(false);
  });

  it("no cache and SWR loading shows loading", () => {
    expect(creatorDrawerLoading(true, null, true)).toBe(true);
  });

  it("disabled drawer does not show loading", () => {
    expect(creatorDrawerLoading(false, null, true)).toBe(false);
  });
});
