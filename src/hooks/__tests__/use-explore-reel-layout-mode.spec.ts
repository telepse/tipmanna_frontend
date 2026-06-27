import { describe, expect, it } from "vitest";

import {
  applyExploreReelPlayerAspectUpdate,
  derivePresentationVideoSizeFromAspect,
} from "../use-explore-reel-layout-mode";
import { buildAspectInfo, mergeYoutubeAspectSources } from "@/lib/youtube-immersive-meta";

describe("derivePresentationVideoSizeFromAspect", () => {
  it("returns null for missing or invalid aspect", () => {
    expect(derivePresentationVideoSizeFromAspect(null)).toBeNull();
    expect(
      derivePresentationVideoSizeFromAspect({
        videoId: "abc",
        width: 0,
        height: 360,
        aspectRatio: 0,
        classification: "landscape",
        source: "oembed",
      })
    ).toBeNull();
  });

  it("tracks merged canonical aspect dimensions", () => {
    const primary = buildAspectInfo("abc123", 480, 360, "oembed");
    const supplemental = buildAspectInfo("abc123", 720, 1280, "thumbnail");
    const merged = mergeYoutubeAspectSources(primary, supplemental);
    expect(derivePresentationVideoSizeFromAspect(merged)).toEqual({
      width: 720,
      height: 1280,
    });
  });

  it("updates when player aspect upgrades oEmbed chrome", () => {
    const oembed = buildAspectInfo("abc123", 480, 360, "oembed");
    const player = buildAspectInfo("abc123", 1080, 1920, "oembed");
    const merged = mergeYoutubeAspectSources(oembed, player);
    expect(derivePresentationVideoSizeFromAspect(merged)).toEqual({
      width: 1080,
      height: 1920,
    });
  });
});

describe("applyExploreReelPlayerAspectUpdate", () => {
  it("mirrors onPlayerAspectInfo and updates presentationVideoSize from merged aspect", () => {
    const oembed = buildAspectInfo("abc123", 480, 360, "oembed");
    const playerUpdate = buildAspectInfo("abc123", 1080, 1920, "oembed");

    const result = applyExploreReelPlayerAspectUpdate(
      oembed,
      null,
      playerUpdate
    );

    expect(result.mergedAspect?.classification).toBe("portrait");
    expect(result.presentationVideoSize).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it("keeps presentationVideoSize aligned with merged aspect after each update", () => {
    const oembed = buildAspectInfo("abc123", 480, 360, "oembed");
    const playerUpdate = buildAspectInfo("abc123", 1080, 1920, "oembed");
    const result = applyExploreReelPlayerAspectUpdate(
      oembed,
      null,
      playerUpdate
    );
    expect(result.presentationVideoSize).toEqual(
      derivePresentationVideoSizeFromAspect(result.mergedAspect)
    );
    expect(result.presentationVideoSize?.width).toBeGreaterThan(
      oembed.width
    );
  });
});
