import { afterEach, describe, expect, it } from "vitest";
import {
  resolveScheduleSourceChange,
  resolveSessionCacheBootstrap,
  shouldSuppressVisibilityScheduleRefresh,
  snapshotPreNavigationScheduleCacheKeys,
  tvScheduleSessionCacheKey,
} from "../tv-single-startup-schedule";
import { isTvSingleStartupScheduleEnabled } from "../tv-feature-flags";

describe("tvScheduleSessionCacheKey", () => {
  it("uses global key for null community", () => {
    expect(tvScheduleSessionCacheKey(null)).toBe("tipmanna-tv-schedule-v2");
  });

  it("uses community-scoped key", () => {
    expect(tvScheduleSessionCacheKey("abc")).toBe(
      "tipmanna-tv-schedule-v2-c/abc"
    );
  });
});

describe("resolveScheduleSourceChange (Phase A)", () => {
  it("skips initial establishment on first effect run", () => {
    expect(resolveScheduleSourceChange(undefined, null)).toEqual({
      action: "skip",
      reason: "initial_establishment",
    });
    expect(resolveScheduleSourceChange(undefined, "comm-1")).toEqual({
      action: "skip",
      reason: "initial_establishment",
    });
  });

  it("skips same-value source updates", () => {
    expect(resolveScheduleSourceChange(null, null)).toEqual({
      action: "skip",
      reason: "same_value",
    });
    expect(resolveScheduleSourceChange("comm-1", "comm-1")).toEqual({
      action: "skip",
      reason: "same_value",
    });
  });

  it("applies genuine global → community change", () => {
    expect(resolveScheduleSourceChange(null, "comm-1")).toEqual({
      action: "apply",
      reason: "genuine_change",
    });
  });

  it("applies genuine community → global change", () => {
    expect(resolveScheduleSourceChange("comm-1", null)).toEqual({
      action: "apply",
      reason: "genuine_change",
    });
  });
});

describe("resolveSessionCacheBootstrap (Phase A SWR)", () => {
  const globalKey = tvScheduleSessionCacheKey(null);

  it("cold run: no pre-nav cache → no bootstrap, mark swr phase complete", () => {
    const decision = resolveSessionCacheBootstrap({
      singleStartupEnabled: true,
      swrEnabled: true,
      swrBootstrapped: false,
      cacheKey: globalKey,
      hasValidCache: false,
      preNavigationCacheKeys: new Set(),
      cacheWrittenThisNavigation: new Set(),
    });
    expect(decision).toEqual({
      shouldBootstrap: false,
      markSwrBootstrapped: true,
    });
  });

  it("warm run: pre-nav cache → bootstrap once", () => {
    const decision = resolveSessionCacheBootstrap({
      singleStartupEnabled: true,
      swrEnabled: true,
      swrBootstrapped: false,
      cacheKey: globalKey,
      hasValidCache: true,
      preNavigationCacheKeys: new Set([globalKey]),
      cacheWrittenThisNavigation: new Set(),
    });
    expect(decision).toEqual({
      shouldBootstrap: true,
      markSwrBootstrapped: true,
    });
  });

  it("same-navigation write must not bootstrap", () => {
    const decision = resolveSessionCacheBootstrap({
      singleStartupEnabled: true,
      swrEnabled: true,
      swrBootstrapped: false,
      cacheKey: globalKey,
      hasValidCache: true,
      preNavigationCacheKeys: new Set(),
      cacheWrittenThisNavigation: new Set([globalKey]),
    });
    expect(decision.shouldBootstrap).toBe(false);
    expect(decision.markSwrBootstrapped).toBe(true);
  });

  it("cache present but not pre-nav and not written this nav → no bootstrap on cold", () => {
    const decision = resolveSessionCacheBootstrap({
      singleStartupEnabled: true,
      swrEnabled: true,
      swrBootstrapped: false,
      cacheKey: globalKey,
      hasValidCache: true,
      preNavigationCacheKeys: new Set(),
      cacheWrittenThisNavigation: new Set(),
    });
    expect(decision.shouldBootstrap).toBe(false);
  });

  it("legacy path bootstraps any valid cache", () => {
    const decision = resolveSessionCacheBootstrap({
      singleStartupEnabled: false,
      swrEnabled: true,
      swrBootstrapped: false,
      cacheKey: globalKey,
      hasValidCache: true,
      preNavigationCacheKeys: new Set(),
      cacheWrittenThisNavigation: new Set([globalKey]),
    });
    expect(decision.shouldBootstrap).toBe(true);
  });

  it("does not bootstrap when already bootstrapped", () => {
    const decision = resolveSessionCacheBootstrap({
      singleStartupEnabled: true,
      swrEnabled: true,
      swrBootstrapped: true,
      cacheKey: globalKey,
      hasValidCache: true,
      preNavigationCacheKeys: new Set([globalKey]),
      cacheWrittenThisNavigation: new Set(),
    });
    expect(decision).toEqual({
      shouldBootstrap: false,
      markSwrBootstrapped: false,
    });
  });
});

describe("shouldSuppressVisibilityScheduleRefresh", () => {
  it("initial visible document: suppress refresh during startup", () => {
    expect(
      shouldSuppressVisibilityScheduleRefresh({
        singleStartupEnabled: true,
        visibilityState: "visible",
        documentWasHidden: false,
        initialStartupInFlight: false,
        initialStartupComplete: false,
      })
    ).toBe(true);
  });

  it("in-flight initial request: suppress visibility refresh", () => {
    expect(
      shouldSuppressVisibilityScheduleRefresh({
        singleStartupEnabled: true,
        visibilityState: "visible",
        documentWasHidden: true,
        initialStartupInFlight: true,
        initialStartupComplete: false,
      })
    ).toBe(true);
  });

  it("hidden → visible after startup complete: allow refresh", () => {
    expect(
      shouldSuppressVisibilityScheduleRefresh({
        singleStartupEnabled: true,
        visibilityState: "visible",
        documentWasHidden: true,
        initialStartupInFlight: false,
        initialStartupComplete: true,
      })
    ).toBe(false);
  });

  it("legacy path never suppresses", () => {
    expect(
      shouldSuppressVisibilityScheduleRefresh({
        singleStartupEnabled: false,
        visibilityState: "visible",
        documentWasHidden: false,
        initialStartupInFlight: true,
        initialStartupComplete: false,
      })
    ).toBe(false);
  });
});

describe("isTvSingleStartupScheduleEnabled", () => {
  const original = process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE;
    } else {
      process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE = original;
    }
  });

  it("is disabled by default", () => {
    delete process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE;
    expect(isTvSingleStartupScheduleEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE = "0";
    expect(isTvSingleStartupScheduleEnabled()).toBe(false);
  });

  it("enables only for 1 or true", () => {
    process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE = "1";
    expect(isTvSingleStartupScheduleEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE = "true";
    expect(isTvSingleStartupScheduleEnabled()).toBe(true);
  });
});

describe("snapshotPreNavigationScheduleCacheKeys", () => {
  it("returns empty set when sessionStorage unavailable", () => {
    expect(snapshotPreNavigationScheduleCacheKeys().size).toBe(0);
  });
});
