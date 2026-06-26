import { describe, expect, it } from "vitest";

import {
  buildAspectInfo,
  classifyYoutubeVideoShape,
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
});
