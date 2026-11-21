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

describe("Explore reel audio wiring", () => {
  it("uses platform audio policy resolver in feed", () => {
    expect(exploreFeedSrc).toContain("resolveExploreReelPlayerAudioProps");
    expect(exploreFeedSrc).toContain("resolveExploreReelTapAction");
    expect(exploreFeedSrc).toContain("shouldDeferProgrammaticUnmute");
  });

  it("activation unlocks scrubber without marking engagedThisReel", () => {
    expect(exploreFeedSrc).toMatch(
      /do NOT set engagedThisReel[\s\S]*?onEngageUnlocked\?\.\(\)/
    );
    expect(exploreFeedSrc).toContain("EXPLORE_ACTIVATION_READY_MAX_ATTEMPTS");
    expect(exploreFeedSrc).toContain('data-testid="explore-tap-for-sound"');
  });

  it("Tap for sound uses React hasReachedPlaying for badge visibility", () => {
    expect(exploreFeedSrc).toContain("setHasReachedPlaying(true)");
    expect(exploreFeedSrc).toMatch(
      /shouldShowExploreTapForSound\([\s\S]*?hasReachedPlaying,/
    );
  });

  it("VideoPlayer props come from exploreReelAudioProps", () => {
    expect(exploreFeedSrc).toMatch(
      /initialMuted=\{exploreReelAudioProps\.initialMuted\}/
    );
    expect(exploreFeedSrc).toMatch(
      /restoreSessionSoundOnProgrammaticPlay=\{\s*exploreReelAudioProps\.restoreSessionSoundOnProgrammaticPlay/
    );
  });

  it("explicit mute button still calls unmute on user gesture", () => {
    expect(exploreFeedSrc).toContain('title={reelMuted ? "Unmute" : "Mute"}');
    expect(exploreFeedSrc).toMatch(/else \{\s*p\.unmute\(\)/);
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

  it("gates mute-sync suppression on restore ref", () => {
    expect(videoPlayerSrc).toMatch(
      /restoreSessionSoundOnProgrammaticPlayRef\.current[\s\S]*shouldSuppressPlayerMuteSync/
    );
  });
});
