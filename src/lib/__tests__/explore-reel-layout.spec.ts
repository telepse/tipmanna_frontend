import { describe, expect, it } from "vitest";

import {
  EXPLORE_REEL_DOCK_HEIGHT,
  EXPLORE_REEL_DOCK_HEIGHT_DESKTOP,
  EXPLORE_REEL_DOCK_HEIGHT_ENGAGED,
  EXPLORE_REEL_DOCK_HEIGHT_ENGAGED_DESKTOP,
  exploreReelActionsRailClassName,
  exploreReelDockHeightCss,
  exploreReelDockClassName,
  exploreReelPresentationFit,
  exploreReelStageClassName,
  exploreReelTitlePlacement,
  exploreReelVideoBandClassName,
  resolveExploreReelLayoutMode,
  resolveExploreReelLayoutModeWhileLoading,
  shouldCorrectExploreReelLayoutMode,
  shouldUpdateExploreReelLayoutMode,
  shouldUpgradeExploreReelLayoutMode,
} from "../explore-reel-layout";

describe("resolveExploreReelLayoutMode", () => {
  it("maps mobile portrait classification to mobilePortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: true,
        classification: "portrait",
      })
    ).toBe("mobilePortrait");
  });

  it("maps mobile square to mobilePortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: true,
        classification: "square",
      })
    ).toBe("mobilePortrait");
  });

  it("maps mobile landscape to mobileLandscape", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: true,
        classification: "landscape",
      })
    ).toBe("mobileLandscape");
  });

  it("maps desktop portrait classification to desktopPortrait", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: false,
        classification: "portrait",
      })
    ).toBe("desktopPortrait");
  });

  it("does not use Shorts URL alone for desktop portrait when landscape classified", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: false,
        classification: "landscape",
      })
    ).toBe("desktopLandscape");
  });

  it("maps desktop landscape to desktopLandscape", () => {
    expect(
      resolveExploreReelLayoutMode({
        isMobile: false,
        classification: "landscape",
      })
    ).toBe("desktopLandscape");
  });
});

describe("resolveExploreReelLayoutModeWhileLoading", () => {
  it("defaults mobile unknown to portrait-ambiguous mobilePortrait", () => {
    expect(
      resolveExploreReelLayoutModeWhileLoading({
        isMobile: true,
        isShortsUrl: false,
      })
    ).toBe("mobilePortrait");
  });

  it("defaults desktop unknown to desktopLandscape", () => {
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

  it("uses portrait path for likely Short duration while loading on desktop", () => {
    expect(
      resolveExploreReelLayoutModeWhileLoading({
        isMobile: false,
        isShortsUrl: false,
        isLikelyShort: true,
      })
    ).toBe("desktopPortrait");
  });
});

describe("shouldUpgradeExploreReelLayoutMode", () => {
  it("allows one-way portrait upgrade on mobile and desktop", () => {
    expect(
      shouldUpgradeExploreReelLayoutMode("mobileLandscape", "mobilePortrait")
    ).toBe(true);
    expect(
      shouldUpgradeExploreReelLayoutMode("desktopLandscape", "desktopPortrait")
    ).toBe(true);
    expect(
      shouldUpgradeExploreReelLayoutMode("mobilePortrait", "mobileLandscape")
    ).toBe(false);
  });
});

describe("shouldCorrectExploreReelLayoutMode", () => {
  it("corrects portrait-ambiguous loading default to landscape when metadata resolves", () => {
    expect(
      shouldCorrectExploreReelLayoutMode(
        "mobilePortrait",
        "mobileLandscape",
        "landscape",
        true
      )
    ).toBe(true);
    expect(
      shouldCorrectExploreReelLayoutMode(
        "desktopPortrait",
        "desktopLandscape",
        "landscape",
        true
      )
    ).toBe(true);
    expect(
      shouldCorrectExploreReelLayoutMode(
        "mobilePortrait",
        "mobileLandscape",
        "landscape",
        false
      )
    ).toBe(false);
    expect(
      shouldCorrectExploreReelLayoutMode(
        "mobilePortrait",
        "mobileLandscape",
        "portrait",
        true
      )
    ).toBe(false);
  });

  it("does not correct portrait loading default when clip is likely a Short", () => {
    expect(
      shouldCorrectExploreReelLayoutMode(
        "mobilePortrait",
        "mobileLandscape",
        "landscape",
        true,
        { isLikelyShort: true }
      )
    ).toBe(false);
    expect(
      shouldCorrectExploreReelLayoutMode(
        "desktopPortrait",
        "desktopLandscape",
        "landscape",
        true,
        { isLikelyShort: true }
      )
    ).toBe(false);
  });
});

describe("shouldUpdateExploreReelLayoutMode", () => {
  it("combines portrait upgrade and landscape correction", () => {
    expect(
      shouldUpdateExploreReelLayoutMode(
        "mobileLandscape",
        "mobilePortrait",
        "portrait",
        true
      )
    ).toBe(true);
    expect(
      shouldUpdateExploreReelLayoutMode(
        "mobilePortrait",
        "mobileLandscape",
        "landscape",
        true
      )
    ).toBe(true);
  });
});

describe("exploreReelActionsRailClassName", () => {
  it("uses wider desktop rail offset", () => {
    expect(exploreReelActionsRailClassName("desktopLandscape")).toContain(
      "right-10"
    );
    expect(exploreReelActionsRailClassName("mobilePortrait")).toContain(
      "right-8"
    );
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
  it("places title above dock on mobile landscape only", () => {
    expect(exploreReelTitlePlacement("mobileLandscape")).toBe("aboveDock");
    expect(exploreReelTitlePlacement("mobilePortrait")).toBe("onVideo");
    expect(exploreReelTitlePlacement("desktopLandscape")).toBe("onVideo");
  });
});

describe("exploreReelStageClassName", () => {
  it("centers desktop portrait in a max-width column", () => {
    expect(exploreReelStageClassName("desktopPortrait")).toContain(
      "max-w-[min(480px,100%)]"
    );
  });

  it("reserves dock space in mobile landscape video band", () => {
    expect(exploreReelVideoBandClassName("mobileLandscape")).toContain(
      "pb-[var(--explore-reel-dock-h"
    );
  });
});

describe("exploreReelDockHeightCss", () => {
  it("uses taller dock when engage scrubber is visible", () => {
    expect(exploreReelDockHeightCss("mobilePortrait", false)).toBe(
      EXPLORE_REEL_DOCK_HEIGHT
    );
    expect(exploreReelDockHeightCss("mobilePortrait", true)).toBe(
      EXPLORE_REEL_DOCK_HEIGHT_ENGAGED
    );
    expect(exploreReelDockHeightCss("desktopLandscape", false)).toBe(
      EXPLORE_REEL_DOCK_HEIGHT_DESKTOP
    );
    expect(exploreReelDockHeightCss("desktopLandscape", true)).toBe(
      EXPLORE_REEL_DOCK_HEIGHT_ENGAGED_DESKTOP
    );
  });
});

describe("exploreReelDockClassName", () => {
  it("uses gradient overlay without solid footer bar", () => {
    const cls = exploreReelDockClassName("mobilePortrait");
    expect(cls).toContain("bg-gradient-to-t");
    expect(cls).not.toContain("bg-black/80");
  });

  it("uses larger padding on desktop", () => {
    expect(exploreReelDockClassName("desktopLandscape")).toContain("px-5");
  });
});
