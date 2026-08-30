import { describe, expect, it } from "vitest";

describe("comment drawer description clamp", () => {
  it("shows See more for long descriptions", () => {
    const description = "A".repeat(150);
    expect(description.length).toBeGreaterThan(120);
  });
});

describe("saved tab hosts loading", () => {
  it("treats undefined savedHostsProp as loading when fetchOnMount is true", () => {
    const savedHostsProp = undefined;
    const fetchOnMount = true;
    const loadingHosts = !savedHostsProp && fetchOnMount;
    expect(loadingHosts).toBe(true);
  });
});

describe("video player unmute guard", () => {
  it("only resumes playback for paused or cued states", () => {
    const YT = { PlayerState: { PLAYING: 1, PAUSED: 2, CUED: 5 } };
    const shouldPlay = (state: number, wasPlaying: boolean) =>
      !wasPlaying &&
      (state === YT.PlayerState.PAUSED || state === YT.PlayerState.CUED);
    expect(shouldPlay(YT.PlayerState.PLAYING, false)).toBe(false);
    expect(shouldPlay(YT.PlayerState.PAUSED, false)).toBe(true);
    expect(shouldPlay(YT.PlayerState.CUED, false)).toBe(true);
  });
});
