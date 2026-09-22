import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { exploreCommunityJoinHref } from "@/lib/community-links";
import {
  navigateToCommunityPage,
  readJoinCommunityIdFromLocation,
} from "@/lib/explore-community-navigation";

describe("explore-community-navigation", () => {
  const assign = vi.fn();

  beforeEach(() => {
    assign.mockReset();
    vi.stubGlobal("window", {
      location: {
        pathname: "/explore",
        search: "?feedTab=trends",
        assign,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("readJoinCommunityIdFromLocation reads live joinCommunity param", () => {
    window.location.search = "?tab=join&joinCommunity=abc123";
    expect(readJoinCommunityIdFromLocation()).toBe("abc123");
    window.location.search = "?feedTab=trends";
    expect(readJoinCommunityIdFromLocation()).toBe("");
  });

  it("navigateToCommunityPage assigns join href when not already there", () => {
    navigateToCommunityPage("abc123");
    expect(assign).toHaveBeenCalledWith(exploreCommunityJoinHref("abc123"));
  });

  it("navigateToCommunityPage is a no-op when already on target", () => {
    const target = exploreCommunityJoinHref("abc123");
    window.location.pathname = "/explore";
    window.location.search = target.replace("/explore?", "?");
    navigateToCommunityPage("abc123");
    expect(assign).not.toHaveBeenCalled();
  });
});
