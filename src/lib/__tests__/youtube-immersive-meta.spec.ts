import { describe, expect, it } from "vitest";

import {
  applyPortraitPriorForVerticalShort,
  buildAspectInfo,
  classifyYoutubeVideoShape,
  isGenericYoutubeLandscapeThumbnail,
  isInconclusiveYoutubeAspect,
  isLikelyYoutubeShort,
  isOembedEmbedPlayerDimensions,
  isYoutubeShortsUrl,
  mergeAspectWithThumbnailProbe,
  mergeYoutubeAspectSources,
} from "../youtube-immersive-meta";

describe("youtube-immersive-meta", () => {
  it("classifies square near 1:1", () => {
    expect(classifyYoutubeVideoShape(1080, 1080)).toBe("square");
  });

  it("classifies portrait when height exceeds width", () => {
    expect(classifyYoutubeVideoShape(1080, 1920)).toBe("portrait");
  });

  it("detects shorts URLs", () => {
    expect(isYoutubeShortsUrl("https://www.youtube.com/shorts/abc123")).toBe(
      true
    );
    expect(isYoutubeShortsUrl("https://youtu.be/abc123")).toBe(false);
  });

  it("detects generic oEmbed player dimensions", () => {
    expect(isOembedEmbedPlayerDimensions(480, 360)).toBe(true);
    expect(isOembedEmbedPlayerDimensions(1080, 1920)).toBe(false);
  });

  it("upgrades oEmbed 480x360 landscape to portrait via tall thumbnail probe", () => {
    const oembed = buildAspectInfo("abc123", 480, 360, "oembed");
    expect(oembed.classification).toBe("landscape");

    const merged = mergeAspectWithThumbnailProbe(oembed, {
      width: 720,
      height: 1280,
    });

    expect(merged.classification).toBe("portrait");
    expect(merged.source).toBe("thumbnail");
    expect(merged.width).toBe(720);
    expect(merged.height).toBe(1280);
  });

  it("keeps true landscape when thumbnail is also landscape", () => {
    const oembed = buildAspectInfo("abc123", 480, 360, "oembed");
    const merged = mergeAspectWithThumbnailProbe(oembed, {
      width: 1280,
      height: 720,
    });
    expect(merged.classification).toBe("landscape");
  });

  it("merges supplemental player aspect into primary metadata", () => {
    const primary = buildAspectInfo("abc123", 480, 360, "oembed");
    const supplemental = buildAspectInfo("abc123", 720, 1280, "thumbnail");
    const merged = mergeYoutubeAspectSources(primary, supplemental);
    expect(merged?.classification).toBe("portrait");
  });

  it("detects likely Shorts from URL or duration", () => {
    expect(
      isLikelyYoutubeShort({
        videoUrl: "https://www.youtube.com/shorts/abc123",
      })
    ).toBe(true);
    expect(
      isLikelyYoutubeShort({
        videoUrl: "https://www.youtube.com/watch?v=abc123",
        durationSeconds: 45,
      })
    ).toBe(true);
    expect(
      isLikelyYoutubeShort({
        videoUrl: "https://www.youtube.com/watch?v=abc123",
        durationSeconds: 120,
      })
    ).toBe(false);
  });

  it("applies portrait prior for Shorts with generic oEmbed chrome", () => {
    const oembed = buildAspectInfo("abc123", 480, 360, "oembed");
    const upgraded = applyPortraitPriorForVerticalShort(
      oembed,
      "https://www.youtube.com/shorts/abc123"
    );
    expect(upgraded.classification).toBe("portrait");
    expect(upgraded.width).toBe(9);
    expect(upgraded.height).toBe(16);
  });

  it("skips portrait prior when thumbnail already resolved portrait", () => {
    const portrait = buildAspectInfo("abc123", 720, 1280, "thumbnail");
    const result = applyPortraitPriorForVerticalShort(
      portrait,
      "https://www.youtube.com/shorts/abc123"
    );
    expect(result).toBe(portrait);
  });

  it("treats generic landscape thumbnail dimensions as inconclusive", () => {
    expect(isGenericYoutubeLandscapeThumbnail(480, 360)).toBe(true);
    expect(isGenericYoutubeLandscapeThumbnail(640, 480)).toBe(true);
    const thumbLandscape = buildAspectInfo("abc123", 640, 480, "thumbnail");
    expect(isInconclusiveYoutubeAspect(thumbLandscape)).toBe(true);
  });

  it("applies portrait prior for Short duration with generic thumbnail landscape", () => {
    const thumbLandscape = buildAspectInfo("abc123", 640, 480, "thumbnail");
    const upgraded = applyPortraitPriorForVerticalShort(
      thumbLandscape,
      "https://www.youtube.com/watch?v=abc123",
      { durationSeconds: 42 }
    );
    expect(upgraded.classification).toBe("portrait");
    expect(upgraded.width).toBe(9);
    expect(upgraded.height).toBe(16);
  });
});
