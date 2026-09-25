import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearHostSessionGrant,
  writeHostSessionGrant,
} from "@/lib/host-session-grant";
import { shouldPrefetchHostSessionVerify } from "@/lib/warm-host-session-intent";

describe("warm host session intent", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearHostSessionGrant();
  });

  it("skips verify prefetch when grant is valid", () => {
    writeHostSessionGrant("host-1");
    expect(shouldPrefetchHostSessionVerify("host-1")).toBe(false);
  });

  it("prefetches verify when no grant", () => {
    expect(shouldPrefetchHostSessionVerify("host-1")).toBe(true);
  });

  it("does not prefetch verify without host id", () => {
    expect(shouldPrefetchHostSessionVerify(null)).toBe(false);
  });
});
