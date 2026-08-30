import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  applyDiscoverScrollRestore,
  buildDiscoverReturnTo,
  buildDiscoverUiSnapshot,
  consumeDiscoverUiRestore,
  isDedicatedDiscoverReturnTo,
  isOverflowScrollContainer,
  peekDiscoverUiRestore,
  resolveDiscoverScroll,
  stashDiscoverUiRestore,
  stripDiscoverPanelParam,
} from "../discover-return.util";

describe("discover-return.util", () => {
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
    vi.stubGlobal("window", {
      sessionStorage: sessionStorageMock,
      scrollY: 880,
      scrollTo: vi.fn(),
      dispatchEvent: () => true,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { documentElement: { scrollTop: 880 } },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("builds panel return preserving feed params", () => {
    expect(
      buildDiscoverReturnTo({
        surface: "explorePanel",
        pathname: "/explore",
        searchParams: "feedTab=trends&feedLang=en-GB",
      })
    ).toBe("/explore?feedTab=trends&feedLang=en-GB&discoverPanel=1");
  });

  it("builds tab return without duplicate tab keys", () => {
    expect(
      buildDiscoverReturnTo({
        surface: "exploreTab",
        pathname: "/explore",
        searchParams: "tab=discover&feedTab=trends",
      })
    ).toContain("tab=discover");
    expect(
      buildDiscoverReturnTo({
        surface: "exploreTab",
        pathname: "/explore",
        searchParams: "tab=discover&feedTab=trends",
      })
    ).toContain("feedTab=trends");
  });

  it("builds dedicated return with search query", () => {
    expect(
      buildDiscoverReturnTo({
        surface: "discovery",
        pathname: "/discover",
        searchParams: "",
        searchTerm: "jazz",
      })
    ).toBe("/discover?q=jazz");
  });

  it("round-trips discover UI restore for a surface", () => {
    const snapshot = buildDiscoverUiSnapshot({
      surface: "explorePanel",
      scrollTop: 420,
      searchTerm: "live",
      selectedTag: "music",
      expandedRails: { live: true },
    });
    stashDiscoverUiRestore(snapshot);
    expect(peekDiscoverUiRestore()?.scrollTop).toBe(420);
    const consumed = consumeDiscoverUiRestore("explorePanel");
    expect(consumed?.searchTerm).toBe("live");
    expect(peekDiscoverUiRestore()).toBeNull();
  });

  it("stripDiscoverPanelParam removes one-shot flag", () => {
    expect(stripDiscoverPanelParam("feedTab=trends&discoverPanel=1")).toBe(
      "feedTab=trends"
    );
  });

  it("resolves window scroll when the container is not overflowing", () => {
    const el = {
      scrollHeight: 400,
      clientHeight: 400,
      scrollTop: 0,
    } as HTMLElement;
    expect(isOverflowScrollContainer(el)).toBe(false);
    expect(resolveDiscoverScroll(el)).toEqual({
      scrollTop: 880,
      scrollRoot: "window",
    });
  });

  it("resolves container scroll when the element overflows", () => {
    const el = {
      scrollHeight: 2000,
      clientHeight: 400,
      scrollTop: 320,
    } as HTMLElement;
    expect(resolveDiscoverScroll(el)).toEqual({
      scrollTop: 320,
      scrollRoot: "container",
    });
  });

  it("restores dedicated discovery scroll on the window", () => {
    applyDiscoverScrollRestore(
      { surface: "discovery", scrollTop: 640, scrollRoot: "window" },
      null
    );
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 640,
      behavior: "auto",
    });
  });

  it("detects dedicated discover return paths", () => {
    expect(isDedicatedDiscoverReturnTo("/discover")).toBe(true);
    expect(isDedicatedDiscoverReturnTo("/discover?q=jazz")).toBe(true);
    expect(isDedicatedDiscoverReturnTo("/discover/music")).toBe(true);
    expect(isDedicatedDiscoverReturnTo("/explore?tab=discover")).toBe(false);
  });
});
