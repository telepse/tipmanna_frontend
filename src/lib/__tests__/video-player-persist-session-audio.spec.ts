import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const videoPlayerSrc = readFileSync(
  resolve(__dirname, "../../components/events/video-player.tsx"),
  "utf8"
);
const tvCardSrc = readFileSync(
  resolve(__dirname, "../../components/explore/tv-explore-schedule-card.tsx"),
  "utf8"
);

describe("VideoPlayer persistSessionAudio contract", () => {
  it("defaults persistSessionAudio to true for existing callers", () => {
    expect(videoPlayerSrc).toMatch(/persistSessionAudio\s*=\s*true/);
  });

  it("gates persistReelSoundPref writes behind persistSessionAudioRef", () => {
    expect(videoPlayerSrc).toContain("persistSessionAudioRef.current");
    expect(videoPlayerSrc).toMatch(
      /if\s*\(\s*persistSessionAudioRef\.current\s*\)\s*\{\s*persistReelSoundPref/
    );
  });

  it("TV explore cards opt out of session-audio persistence", () => {
    expect(tvCardSrc).toContain("persistSessionAudio={false}");
  });
});
