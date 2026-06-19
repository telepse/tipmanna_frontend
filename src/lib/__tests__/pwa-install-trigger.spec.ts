import { describe, expect, it } from "vitest";

import {
  isPwaAutoPromptSuppressed,
  shouldShowManualInstallAffordance,
} from "@/lib/pwa-install-trigger";

describe("pwa-install-trigger gating", () => {
  it("suppresses auto prompt when installed or do_not_show", () => {
    expect(isPwaAutoPromptSuppressed({ status: "installed" }, false)).toBe(
      true
    );
    expect(isPwaAutoPromptSuppressed({ status: "do_not_show" }, false)).toBe(
      true
    );
    expect(isPwaAutoPromptSuppressed(null, true)).toBe(true);
  });

  it("allows auto prompt after a single dismiss", () => {
    expect(
      isPwaAutoPromptSuppressed({ status: "dismissed", dismissCount: 1 }, false)
    ).toBe(false);
  });

  it("shows manual affordance after dismiss or do_not_show", () => {
    expect(
      shouldShowManualInstallAffordance({ status: "do_not_show" }, false)
    ).toBe(true);
    expect(
      shouldShowManualInstallAffordance(
        { status: "dismissed", dismissCount: 1 },
        false
      )
    ).toBe(true);
    expect(shouldShowManualInstallAffordance(null, false)).toBe(false);
  });

  it("hides manual affordance when installed", () => {
    expect(
      shouldShowManualInstallAffordance({ status: "do_not_show" }, true)
    ).toBe(false);
  });
});
