import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  hasPromptAFiredThisSession,
  hasPromptBFiredThisSession,
  isDashboardPath,
  markPromptAFiredThisSession,
  markPromptBFiredThisSession,
} from "../pwa-install-trigger";

describe("pwa-install-trigger policy helpers", () => {
  it("detects dashboard paths", () => {
    expect(isDashboardPath("/host/alice")).toBe(true);
    expect(isDashboardPath("/explore")).toBe(false);
    expect(isDashboardPath("/content/abc")).toBe(false);
  });

  it("tracks one A and one B prompt per session", () => {
    vi.stubGlobal("window", {} as Window);
    vi.stubGlobal(
      "sessionStorage",
      (() => {
        const store = new Map<string, string>();
        return {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
          removeItem: (k: string) => store.delete(k),
          clear: () => store.clear(),
        };
      })()
    );
    expect(hasPromptAFiredThisSession()).toBe(false);
    markPromptAFiredThisSession();
    expect(hasPromptAFiredThisSession()).toBe(true);
    expect(hasPromptBFiredThisSession()).toBe(false);
    markPromptBFiredThisSession();
    expect(hasPromptBFiredThisSession()).toBe(true);
  });
});
