import { describe, expect, it } from "vitest";

import {
  resolvePaymentRestoreMode,
  resolvePaymentSnapshotOriginModeForRedirect,
} from "@/lib/tv-payment-restore";
import { shouldArmPostPaymentAxis } from "@/lib/tv-post-payment-axis";

describe("payment contract — restore mode (Cases A–D)", () => {
  it("Case A/B — LOCAL snapshot dismiss: stays LOCAL, no wall-clock GLOBAL", () => {
    expect(
      resolvePaymentRestoreMode({
        mode: "LOCAL",
        originMode: "LOCAL",
        paymentSucceeded: false,
      })
    ).toBe("LOCAL");
    expect(
      resolvePaymentRestoreMode({
        mode: "LOCAL",
        originMode: "GLOBAL",
        paymentSucceeded: false,
      })
    ).toBe("LOCAL");
    expect(
      shouldArmPostPaymentAxis({
        originMode: "GLOBAL",
        paymentSucceeded: false,
      })
    ).toBe(false);
  });

  it("Case C — LOCAL-origin successful payment stays LOCAL without PPLA", () => {
    expect(
      resolvePaymentRestoreMode({
        mode: "LOCAL",
        originMode: "LOCAL",
        paymentSucceeded: true,
      })
    ).toBe("LOCAL");
    expect(
      shouldArmPostPaymentAxis({
        originMode: "LOCAL",
        paymentSucceeded: true,
      })
    ).toBe(false);
  });

  it("Case D — GLOBAL-origin successful payment stays LOCAL (PPLA), not wall-clock GLOBAL", () => {
    expect(
      resolvePaymentRestoreMode({
        mode: "LOCAL",
        originMode: "GLOBAL",
        paymentSucceeded: true,
      })
    ).toBe("LOCAL");
    expect(
      shouldArmPostPaymentAxis({
        originMode: "GLOBAL",
        paymentSucceeded: true,
      })
    ).toBe(true);
  });

  it("legacy snapshot mode GLOBAL still restores wall-clock GLOBAL", () => {
    expect(
      resolvePaymentRestoreMode({
        mode: "GLOBAL",
        originMode: "LOCAL",
        paymentSucceeded: true,
      })
    ).toBe("GLOBAL");
  });
});

describe("Stripe redirect — preserve GLOBAL originMode", () => {
  it("keeps GLOBAL origin from drawer snapshot after mode forced LOCAL", () => {
    expect(
      resolvePaymentSnapshotOriginModeForRedirect({
        priorSnapshotOriginMode: "GLOBAL",
        priorSnapshotMode: "LOCAL",
        modeRefCurrent: "LOCAL",
      })
    ).toBe("GLOBAL");
  });

  it("falls back to modeRef when no prior snapshot", () => {
    expect(
      resolvePaymentSnapshotOriginModeForRedirect({
        modeRefCurrent: "LOCAL",
      })
    ).toBe("LOCAL");
  });
});
