import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  buildReturnToWithDrawerHints,
  clearPlaybackReturn,
  readPlaybackReturn,
  safeInternalPlaybackPath,
  writePlaybackReturn,
} from "../playback-return-stack";

describe("playback-return-stack", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const sessionStorageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    };
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    vi.stubGlobal("window", { sessionStorage: sessionStorageMock });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rejects external return paths", () => {
    expect(safeInternalPlaybackPath("//evil.com")).toBeNull();
    expect(safeInternalPlaybackPath("https://evil.com")).toBeNull();
  });

  it("writes and reads a valid return context", () => {
    writePlaybackReturn({
      returnTo: "/@creator",
      label: "Back to @creator",
      profileUi: { tab: "channels", scrollY: 120 },
    });
    const ctx = readPlaybackReturn();
    expect(ctx?.returnTo).toBe("/@creator");
    expect(ctx?.label).toBe("Back to @creator");
    expect(ctx?.profileUi?.tab).toBe("channels");
  });

  it("expires after TTL", () => {
    writePlaybackReturn({ returnTo: "/explore" });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readPlaybackReturn()).toBeNull();
  });

  it("clear removes stored context", () => {
    writePlaybackReturn({ returnTo: "/explore" });
    clearPlaybackReturn();
    expect(readPlaybackReturn()).toBeNull();
  });

  it("buildReturnToWithDrawerHints adds drawer params", () => {
    expect(
      buildReturnToWithDrawerHints("/explore", {
        type: "creator",
        username: "creator",
      })
    ).toBe("/explore?creatorDrawer=creator");
    expect(
      buildReturnToWithDrawerHints("/explore", {
        type: "community",
        communityId: "abc-123",
      })
    ).toBe("/explore?communityDrawer=abc-123");
  });

  it("returns null for malformed JSON", () => {
    sessionStorage.setItem("tipmanna:playback-return:v1", "{bad");
    expect(readPlaybackReturn()).toBeNull();
  });
});
