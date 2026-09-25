import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearHostSessionGrant,
  HOST_SESSION_GRANT_TTL_MS,
  isHostSessionGrantValid,
  writeHostSessionGrant,
} from "@/lib/host-session-grant";

describe("host session verify grant", () => {
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("validates matching hostId within TTL", () => {
    writeHostSessionGrant("host-1");
    expect(isHostSessionGrantValid("host-1")).toBe(true);
    expect(isHostSessionGrantValid("host-2")).toBe(false);
  });

  it("expires after TTL", () => {
    writeHostSessionGrant("host-1");
    vi.advanceTimersByTime(HOST_SESSION_GRANT_TTL_MS);
    expect(isHostSessionGrantValid("host-1")).toBe(false);
  });

  it("clear removes grant", () => {
    writeHostSessionGrant("host-1");
    clearHostSessionGrant();
    expect(isHostSessionGrantValid("host-1")).toBe(false);
  });
});
