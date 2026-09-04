import { describe, expect, it } from "vitest";

import { shouldApplyTipConfigFetch } from "@/hooks/use-tip-config";

describe("shouldApplyTipConfigFetch", () => {
  it("accepts matching request generation", () => {
    expect(shouldApplyTipConfigFetch(3, 3)).toBe(true);
  });

  it("rejects stale request generation", () => {
    expect(shouldApplyTipConfigFetch(2, 3)).toBe(false);
  });
});
