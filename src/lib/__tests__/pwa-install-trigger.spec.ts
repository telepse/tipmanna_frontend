import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  isPwaAutoPromptSuppressed,
  shouldShowManualInstallAffordance,
  readDwellElapsedMs,
  writeDwellElapsedMs,
  PWA_DWELL_MS_KEY,
  requestPwaPrompt,
  subscribePwaPrompt,
  isDashboardPath,
  hasPromptAFiredThisSession,
  markPromptAFiredThisSession,
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
    expect(shouldShowManualInstallAffordance(null, true)).toBe(false);
  });

  it("skips dashboard paths", () => {
    expect(isDashboardPath("/host/alice/settings")).toBe(true);
    expect(isDashboardPath("/tv")).toBe(false);
  });
});

describe("pwa-install-trigger session tracking", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {} as Window);
    vi.stubGlobal(
      "sessionStorage",
      (() => {
        const store = new Map<string, string>();
        return {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => {
            store.set(k, v);
          },
          removeItem: (k: string) => {
            store.delete(k);
          },
          clear: () => store.clear(),
        };
      })()
    );
  });

  it("persists dwell elapsed ms", () => {
    expect(readDwellElapsedMs()).toBe(0);
    writeDwellElapsedMs(120000);
    expect(readDwellElapsedMs()).toBe(120000);
    expect(sessionStorage.getItem(PWA_DWELL_MS_KEY)).toBe("120000");
  });

  it("tracks prompt A once per session", () => {
    expect(hasPromptAFiredThisSession()).toBe(false);
    markPromptAFiredThisSession();
    expect(hasPromptAFiredThisSession()).toBe(true);
  });

  it("notifies subscribers on requestPwaPrompt", () => {
    const listener = vi.fn();
    const unsub = subscribePwaPrompt(listener);
    requestPwaPrompt("payment");
    expect(listener).toHaveBeenCalledWith("payment");
    unsub();
    requestPwaPrompt("engagement");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
