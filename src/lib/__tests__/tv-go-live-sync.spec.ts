import { describe, expect, it } from "vitest";

import { shouldSkipGlobalModeEffectInitialSync } from "@/lib/tv-go-live-sync";

describe("shouldSkipGlobalModeEffectInitialSync", () => {
  it("skips one initial sync after explicit Go Live already synced", () => {
    const first = shouldSkipGlobalModeEffectInitialSync({
      suppressNextInitialSync: true,
    });
    expect(first.skip).toBe(true);
    expect(first.nextSuppress).toBe(false);

    const second = shouldSkipGlobalModeEffectInitialSync({
      suppressNextInitialSync: first.nextSuppress,
    });
    expect(second.skip).toBe(false);
  });

  it("does not skip ordinary GLOBAL mode/schedule bootstrap sync", () => {
    const decision = shouldSkipGlobalModeEffectInitialSync({
      suppressNextInitialSync: false,
    });
    expect(decision.skip).toBe(false);
    expect(decision.nextSuppress).toBe(false);
  });
});
