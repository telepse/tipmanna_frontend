import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const exploreFeedSrc = readFileSync(
  resolve(__dirname, "../../components/explore/explore-feed-client.tsx"),
  "utf8"
);
const videoPlayerSrc = readFileSync(
  resolve(__dirname, "../../components/events/video-player.tsx"),
  "utf8"
);
const contentClientSrc = readFileSync(
  resolve(__dirname, "../../components/events/content-client.tsx"),
  "utf8"
);
const exploreReelAdvanceSrc = readFileSync(
  resolve(__dirname, "../explore-reel-advance.ts"),
  "utf8"
);

describe("Explore reel programmatic audio contract", () => {
  it("Explore VideoPlayer opts out of programmatic session sound restore", () => {
    expect(exploreFeedSrc).toContain(
      "restoreSessionSoundOnProgrammaticPlay={false}"
    );
  });

  it("Explore active reel uses initialMuted (always muted on activation)", () => {
    expect(exploreFeedSrc).toMatch(
      /<VideoPlayer[\s\S]*?initialMuted[\s\S]*?restoreSessionSoundOnProgrammaticPlay=\{false\}/
    );
    expect(exploreFeedSrc).not.toMatch(
      /initialMuted=\{!loadReelSoundPref\(\)\}/
    );
  });

  it("Explore feed does not programmatically unmute on activation", () => {
    expect(exploreFeedSrc).not.toMatch(
      /if \(!loadReelSoundPref\(\)\) return;\s*const p = slideIndex === activeIndex[\s\S]*?p\.unmute\(\)/
    );
  });

  it("explicit mute button still calls unmute on user gesture", () => {
    expect(exploreFeedSrc).toContain('title={reelMuted ? "Unmute" : "Mute"}');
    expect(exploreFeedSrc).toMatch(/else \{\s*p\.unmute\(\)/);
  });

  it("first tap before PLAYING calls play instead of pause", () => {
    expect(exploreFeedSrc).toContain("hasReachedPlayingRef");
    expect(exploreFeedSrc).toMatch(
      /if \(!hasReachedPlayingRef\.current\) \{[\s\S]*?startPlaybackFromUserGesture/
    );
    expect(exploreFeedSrc).toMatch(
      /if \(playing\) \{[\s\S]*?hasReachedPlayingRef\.current = true/
    );
  });

  it("ENDED → next handling unchanged in explore-reel-advance", () => {
    expect(exploreReelAdvanceSrc).toContain("shouldHandleExploreReelEnded");
  });
});

describe("VideoPlayer restoreSessionSoundOnProgrammaticPlay default", () => {
  it("defaults to true for non-Explore consumers", () => {
    expect(videoPlayerSrc).toMatch(
      /restoreSessionSoundOnProgrammaticPlay\s*=\s*true/
    );
    expect(contentClientSrc).not.toContain(
      "restoreSessionSoundOnProgrammaticPlay={false}"
    );
  });

  it("gates restoreReelSoundIfPreferred and preferSound", () => {
    expect(videoPlayerSrc).toContain(
      "restoreSessionSoundOnProgrammaticPlayRef.current"
    );
    expect(videoPlayerSrc).toMatch(
      /const preferSound =[\s\S]*restoreSessionSoundOnProgrammaticPlayRef\.current/
    );
  });
});
