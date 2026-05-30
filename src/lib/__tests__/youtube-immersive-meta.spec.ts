import { describe, expect, it } from "vitest";
import {
  classifyYoutubeVideoShape,
  isYoutubeShortsUrl,
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
});
