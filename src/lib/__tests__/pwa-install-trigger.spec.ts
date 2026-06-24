import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  isPwaAutoPromptSuppressed,
  shouldShowManualInstallAffordance,
  readEngagementElapsedMs,
  writeEngagementElapsedMs,
  markPendingPaymentPrompt,
  consumePendingPaymentPrompt,
  PWA_ENGAGEMENT_ELAPSED_KEY,
  PWA_PENDING_PAYMENT_KEY,
  requestPwaPrompt,
  subscribePwaPrompt,
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

  it("does not suppress dismissed-with-count below do_not_show threshold", () => {
    expect(
      isPwaAutoPromptSuppressed({ status: "dismissed", dismissCount: 0 }, false)
    ).toBe(false);
    expect(
      isPwaAutoPromptSuppressed({ status: "dismissed", dismissCount: 1 }, false)
    ).toBe(false);
  });

  it("suppresses after second dismiss sets do_not_show", () => {
    expect(
      isPwaAutoPromptSuppressed({ status: "do_not_show", dismissCount: 2 }, false)
    ).toBe(true);
  });
});

describe("pwa-install-trigger engagement and payment helpers", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
    vi.stubGlobal("window", { setTimeout: globalThis.setTimeout });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists and reads engagement elapsed ms", () => {
    expect(readEngagementElapsedMs()).toBe(0);
    writeEngagementElapsedMs(120_000);
    expect(readEngagementElapsedMs()).toBe(120_000);
    expect(sessionStorage.getItem(PWA_ENGAGEMENT_ELAPSED_KEY)).toBe("120000");
  });

  it("marks and consumes pending payment prompt once", () => {
    expect(consumePendingPaymentPrompt()).toBe(false);
    markPendingPaymentPrompt();
    expect(sessionStorage.getItem(PWA_PENDING_PAYMENT_KEY)).toBe("1");
    expect(consumePendingPaymentPrompt()).toBe(true);
    expect(consumePendingPaymentPrompt()).toBe(false);
  });

  it("notifies subscribed listeners when prompt is requested", () => {
    const listener = vi.fn();
    const unsubscribe = subscribePwaPrompt(listener);
    requestPwaPrompt("payment");
    expect(listener).toHaveBeenCalledWith("payment");
    unsubscribe();
    requestPwaPrompt("engagement");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
