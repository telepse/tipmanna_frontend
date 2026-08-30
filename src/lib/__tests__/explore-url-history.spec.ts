import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  commitExploreHistory,
  exploreCurrentBrowserHref,
  isExploreSameOriginHref,
} from "../explore-url-history";
import { exploreHrefsEqual } from "../explore-url-sync-policy";

describe("explore-url-history", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:3000",
        pathname: "/explore",
        search: "",
        href: "http://localhost:3000/explore",
      },
      history: {
        state: null,
        pushState: vi.fn(),
        replaceState: vi.fn(),
        length: 2,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isExploreSameOriginHref accepts /explore paths", () => {
    expect(isExploreSameOriginHref("/explore?feedTab=saves")).toBe(true);
    expect(isExploreSameOriginHref("/partner")).toBe(false);
  });

  it("commitExploreHistory pushState updates explore query URLs once", () => {
    const pushed = commitExploreHistory({
      href: "/explore?feedTab=saves",
      mode: "push",
      source: "feed-subtab-click",
    });
    expect(pushed).toBe(true);
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      "",
      "/explore?feedTab=saves"
    );
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });

  it("commitExploreHistory skips equal hrefs", () => {
    window.location.search = "?feedTab=trends";
    const pushed = commitExploreHistory({
      href: "/explore?feedTab=trends",
      mode: "push",
      source: "feed-subtab-click",
    });
    expect(pushed).toBe(false);
    expect(window.history.pushState).not.toHaveBeenCalled();
  });

  it("commitExploreHistory replaceState for passive normalization", () => {
    commitExploreHistory({
      href: "/explore?feedTab=trends",
      mode: "replace",
      source: "passive-sync",
    });
    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/explore?feedTab=trends"
    );
  });

  it("exploreHrefsEqual treats order-independent query as equal", () => {
    expect(
      exploreHrefsEqual(
        "/explore?feedTab=saves&feedTypes=comedy",
        "/explore?feedTypes=comedy&feedTab=saves"
      )
    ).toBe(true);
  });

  it("exploreCurrentBrowserHref reads window location", () => {
    window.location.pathname = "/explore";
    window.location.search = "?feedTab=tv";
    expect(exploreCurrentBrowserHref()).toBe("/explore?feedTab=tv");
  });
});
