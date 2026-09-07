import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTvPagePath,
  navigateToTvSource,
} from "@/lib/tv-source-navigation";

describe("tv-source-navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        pathname: "/explore",
        search: "",
        assign: vi.fn(),
        reload: vi.fn(),
      },
      localStorage: {
        setItem: vi.fn(),
        removeItem: vi.fn(),
        getItem: vi.fn(),
      },
    });
  });

  it("buildTvPagePath returns /tv for global source", () => {
    expect(buildTvPagePath(null)).toBe("/tv");
    expect(buildTvPagePath("")).toBe("/tv");
  });

  it("buildTvPagePath encodes community id", () => {
    expect(buildTvPagePath("abc-123")).toBe("/tv?community=abc-123");
  });

  it("navigateToTvSource hard-assigns /tv from explore", () => {
    navigateToTvSource(null);
    expect(window.location.assign).toHaveBeenCalledWith("/tv");
  });

  it("navigateToTvSource reloads when already on target", () => {
    window.location.pathname = "/tv";
    window.location.search = "";
    navigateToTvSource(null);
    expect(window.location.reload).toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
