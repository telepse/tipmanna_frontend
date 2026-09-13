import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  expressNavigateToExplore,
  expressNavigateToTv,
} from "@/lib/express-surface-navigation";

vi.mock("@/lib/tv-source-navigation", () => ({
  navigateToTvSource: vi.fn(),
}));

import { navigateToTvSource } from "@/lib/tv-source-navigation";

describe("express-surface-navigation", () => {
  const assign = vi.fn();

  beforeEach(() => {
    assign.mockReset();
    vi.mocked(navigateToTvSource).mockReset();
    vi.stubGlobal("window", {
      location: {
        pathname: "/room/ev1",
        search: "",
        assign,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("expressNavigateToTv delegates to navigateToTvSource", () => {
    expressNavigateToTv("comm-1");
    expect(navigateToTvSource).toHaveBeenCalledWith("comm-1");
  });

  it("expressNavigateToTv no-ops when already on same /tv target", () => {
    window.location.pathname = "/tv";
    window.location.search = "";
    expressNavigateToTv();
    expect(navigateToTvSource).not.toHaveBeenCalled();
  });

  it("expressNavigateToExplore assigns /explore from heavy pages", () => {
    expressNavigateToExplore();
    expect(assign).toHaveBeenCalledWith("/explore?feedTab=trends");
  });

  it("expressNavigateToExplore uses in-place feed switch when already on Explore", () => {
    window.location.pathname = "/explore";
    window.location.search = "?tab=join&joinCommunity=abc";
    expressNavigateToExplore();
    expect(assign).toHaveBeenCalledWith("/explore?feedTab=trends");
  });
});
