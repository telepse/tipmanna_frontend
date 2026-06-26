"use client";

import { useSearchParams } from "next/navigation";

import {
  exploreReelDockActionsClassName,
  exploreReelDockClassName,
  exploreReelDockHeightCss,
  exploreReelStageClassName,
  exploreReelTitleAboveDockClassName,
  exploreReelTitleOnVideoClassName,
  exploreReelTitlePlacement,
  exploreReelVideoBandClassName,
  type ExploreReelLayoutMode,
} from "@/lib/explore-reel-layout";

const LAYOUT_MODES: ExploreReelLayoutMode[] = [
  "mobilePortrait",
  "mobileLandscape",
  "desktopPortrait",
  "desktopLandscape",
];

function parseLayoutMode(raw: string | null): ExploreReelLayoutMode {
  if (raw && LAYOUT_MODES.includes(raw as ExploreReelLayoutMode)) {
    return raw as ExploreReelLayoutMode;
  }
  return "desktopLandscape";
}

export function E2eExploreReelLayoutClient() {
  const searchParams = useSearchParams();
  const layoutMode = parseLayoutMode(searchParams.get("mode"));
  const titlePlacement = exploreReelTitlePlacement(layoutMode);
  const dockHeightCss = exploreReelDockHeightCss(layoutMode, false);

  return (
    <main className="flex h-[100dvh] flex-col bg-black">
      <div
        data-testid="explore-feed-scroll"
        className="h-full min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto"
      >
        <div
          data-explore-slide
          data-index={0}
          data-explore-layout-mode={layoutMode}
          className="relative flex h-full min-h-0 w-full shrink-0 snap-start flex-col bg-black"
          style={{ ["--explore-reel-dock-h" as string]: dockHeightCss }}
        >
          <div
            className={`${exploreReelStageClassName(layoutMode)} min-h-0 flex-1`}
          >
            <div className={exploreReelVideoBandClassName(layoutMode)}>
              <div
                data-testid="explore-video-shell"
                className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-neutral-900"
              >
                <div className="flex flex-1 items-center justify-center text-sm text-white/70">
                  Video stage ({layoutMode})
                </div>
              </div>
            </div>
          </div>

          {titlePlacement === "onVideo" ? (
            <div
              data-testid="explore-reel-title-on-video"
              className={exploreReelTitleOnVideoClassName(layoutMode)}
            >
              <p className="text-sm font-semibold drop-shadow-md">
                Title on video
              </p>
            </div>
          ) : null}

          {titlePlacement === "aboveDock" ? (
            <div
              data-testid="explore-reel-title-above-dock"
              className={exploreReelTitleAboveDockClassName(layoutMode)}
            >
              <p className="text-sm font-semibold drop-shadow-md">
                Title above dock
              </p>
            </div>
          ) : null}

          <div
            data-testid="explore-slide-actions"
            className={exploreReelDockClassName(layoutMode)}
          >
            <div className={exploreReelDockActionsClassName(layoutMode)}>
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-sm text-black"
              >
                Watch TV
              </button>
              <button
                type="button"
                className="bg-primary rounded-full px-4 py-2 text-sm text-white"
              >
                Engage
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
