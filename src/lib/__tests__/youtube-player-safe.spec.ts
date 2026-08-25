/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";

import {
  isYoutubePlayerApiReady,
  isYoutubePlayerIframeLive,
  safeYoutubeCall,
} from "@/lib/tv/youtube-player-safe";

describe("isYoutubePlayerIframeLive", () => {
  it("returns false when player or getIframe is missing", () => {
    expect(isYoutubePlayerIframeLive(null)).toBe(false);
    expect(isYoutubePlayerIframeLive({})).toBe(false);
  });

  it("returns true when iframe is attached to document", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    const player = {
      getIframe: () => iframe,
    };
    expect(isYoutubePlayerIframeLive(player)).toBe(true);
    iframe.remove();
  });

  it("returns false when iframe is detached", () => {
    const iframe = document.createElement("iframe");
    const player = {
      getIframe: () => iframe,
    };
    expect(isYoutubePlayerIframeLive(player)).toBe(false);
  });
});

describe("isYoutubePlayerApiReady", () => {
  it("requires ready flag, player methods, and live iframe", () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    const player = {
      getIframe: () => iframe,
      getCurrentTime: () => 0,
    };
    expect(isYoutubePlayerApiReady(false, player)).toBe(false);
    expect(isYoutubePlayerApiReady(true, player)).toBe(true);
    iframe.remove();
  });
});

describe("safeYoutubeCall", () => {
  it("returns fn result on success", () => {
    expect(safeYoutubeCall(() => 42, 0)).toBe(42);
  });

  it("returns fallback when fn throws", () => {
    expect(
      safeYoutubeCall(() => {
        throw new Error("iframe.src");
      }, "fallback")
    ).toBe("fallback");
  });
});
