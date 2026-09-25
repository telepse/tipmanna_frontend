import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tip-customization", () => ({
  isTipCustomizationEnabled: () => true,
}));

import {
  getCachedTipConfig,
  primeTipConfigCacheForTests,
  resetTipConfigCacheForTests,
  resolveTipConfigStateForEvent,
  shouldApplyTipConfigFetch,
} from "@/hooks/use-tip-config";

describe("shouldApplyTipConfigFetch", () => {
  it("accepts matching request generation", () => {
    expect(shouldApplyTipConfigFetch(3, 3)).toBe(true);
  });

  it("rejects stale request generation", () => {
    expect(shouldApplyTipConfigFetch(2, 3)).toBe(false);
  });
});

describe("tip-config memory cache", () => {
  afterEach(() => {
    resetTipConfigCacheForTests();
  });

  it("does not inherit event A config when resolving event B", () => {
    primeTipConfigCacheForTests("event-a", {
      mode: "live",
      version: 1,
      etag: "e1",
      reviewNeeded: false,
      config: {
        ctaSectionLabel: "Engage",
        ctaPayLabel: "Pay",
        currency: "GBP",
        textCharacter: {
          enabled: true,
          priceMinor: 500,
          maxLength: 100,
          priceTouchedByHost: false,
        },
        sectionItems: [],
        drawerItems: [],
        eliteCharacterIds: ["elite-a"],
      },
    });

    expect(getCachedTipConfig("event-b")).toBeUndefined();
    expect(resolveTipConfigStateForEvent("event-b").status).toBe("loading");
  });

  it("returns ready immediately for a cache hit on the same event id", () => {
    primeTipConfigCacheForTests("event-b", { mode: "legacy" });

    const state = resolveTipConfigStateForEvent("event-b");
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.mode).toBe("legacy");
    }
  });
});
