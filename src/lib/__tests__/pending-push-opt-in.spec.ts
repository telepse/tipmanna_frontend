import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearPendingPushOptIn,
  readPendingPushOptIn,
  setPendingPushOptIn,
  shouldDeferPushUntilInstalled,
} from "@/lib/pending-push-opt-in";

describe("pending-push-opt-in", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "localStorage",
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
    vi.stubGlobal("window", {} as Window);
  });

  it("stores and clears pending opt-in", () => {
    setPendingPushOptIn("test");
    expect(readPendingPushOptIn()?.source).toBe("test");
    clearPendingPushOptIn();
    expect(readPendingPushOptIn()).toBeNull();
  });

  it("shouldDeferPushUntilInstalled is false without window", () => {
    expect(shouldDeferPushUntilInstalled()).toBe(false);
  });
});
