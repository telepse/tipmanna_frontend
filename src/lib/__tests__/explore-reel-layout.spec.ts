import { describe, expect, it } from "vitest";

import {
  EXPLORE_REEL_DOCK_HEIGHT,
  EXPLORE_REEL_DOCK_HEIGHT_ENGAGED,
  exploreReelDockHeightCss,
  exploreReelDockClassName,
  exploreReelPresentationFit,
  exploreReelStageClassName,
  exploreReelTitlePlacement,
  exploreReelVideoBandClassName,
  resolveExploreReelLayoutMode,
  resolveExploreReelLayoutModeWhileLoading,
} from "../explore-reel-layout";

describe("resolveExploreReelLayoutMode", () => {
  it("maps mobile portrait classification to mobilePortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: true,
        classification: "portrait",
        isShortsUrl: false,
      })
    ).toBe("mobilePortrait");
  });

  it("maps mobile square to mobilePortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: true,
        classification: "square",
        isShortsUrl: false,
      })
    ).toBe("mobilePortrait");
  });

  it("maps mobile landscape to mobileLandscape", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: true,
        classification: "landscape",
        isShortsUrl: false,
      })
    ).toBe("mobileLandscape");
  });

  it("maps desktop portrait classification to desktopPortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: false,
        classification: "portrait",
        isShortsUrl: false,
      })
    ).toBe("desktopPortrait");
  });

  it("maps desktop portrait and Shorts URL to desktopPortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: false,
        classification: "landscape",
        isShortsUrl: true,
      })
    ).toBe("desktopPortrait");
  });

  it("maps desktop landscape to desktopLandscape", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: false,
        classification: "landscape",
        isShortsUrl: false,
      })
    ).toBe("desktopLandscape");
  });
});

describe("resolveExploreReelLayoutModeWhileLoading", () => {
  it("defaults to landscape modes when classification unknown", () => {
    expect(
      resolveExploreReelLayoutModeWhileLoading({
        isMobile: true,
        isShortsUrl: false,
      })
    ).toBe("mobileLandscape");
    expect(
      resolveExploreReelLayoutModeWhileLoading({
        isMobile: false,
        isShortsUrl: false,
      })
    ).toBe("desktopLandscape");
  });

  it("uses portrait path for Shorts URL while loading", () => {
    expect(
      resolveExploreReelLayoutModeWhileLoading({
        isMobile: true,
        isShortsUrl: true,
      })
    ).toBe("mobilePortrait");
  });
});

describe("exploreReelPresentationFit", () => {
  it("uses contain only for mobile landscape", () => {
    expect(exploreReelPresentationFit("mobileLandscape")).toBe("contain");
    expect(exploreReelPresentationFit("mobilePortrait")).toBe("cover");
    expect(exploreReelPresentationFit("desktopPortrait")).toBe("cover");
    expect(exploreReelPresentationFit("desktopLandscape")).toBe("cover");
  });
});

describe("exploreReelTitlePlacement", () => {
  it("places title below video band on mobile landscape only", () => {
    expect(exploreReelTitlePlacement("mobileLandscape")).toBe("belowVideoBand");
    expect(exploreReelTitlePlacement("mobilePortrait")).toBe("onVideo");
    expect(exploreReelTitlePlacement("desktopLandscape")).toBe("onVideo");
  });
});

describe("exploreReelStageClassName", () => {
  it("centers desktop portrait in a max-width column", () => {
    expect(exploreReelStageClassName("desktopPortrait")).toContain(
      "max-w-[min(420px,100%)]"
    );
  });

  it("centers mobile landscape video band", () => {
    expect(exploreReelVideoBandClassName("mobileLandscape")).toContain(
      "justify-center"
    );
  });
});

describe("exploreReelDockHeightCss", () => {
  it("uses taller dock when engage scrubber is visible", () => {
    expect(exploreReelDockHeightCss(false)).toBe(EXPLORE_REEL_DOCK_HEIGHT);
    expect(exploreReelDockHeightCss(true)).toBe(
      EXPLORE_REEL_DOCK_HEIGHT_ENGAGED
    );
  });
});

describe("exploreReelDockClassName", () => {
  it("uses gradient overlay without solid footer bar", () => {
    const cls = exploreReelDockClassName();
    expect(cls).toContain("bg-gradient-to-t");
    expect(cls).not.toContain("bg-black/80");
  });
});
