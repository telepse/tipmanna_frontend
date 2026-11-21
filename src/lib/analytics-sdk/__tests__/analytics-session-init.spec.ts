import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureAnalyticsSessionStorage,
  getAnalyticsSessionId,
} from "../../analytics-session";

describe("analytics session storage bootstrap", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
    vi.stubGlobal("crypto", {
      randomUUID: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ensureAnalyticsSessionStorage creates a persistent session id", () => {
    expect(store.get("tipmanna-analytics-session")).toBeUndefined();
    const id = ensureAnalyticsSessionStorage();
    expect(id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(getAnalyticsSessionId()).toBe(id);
  });
});
