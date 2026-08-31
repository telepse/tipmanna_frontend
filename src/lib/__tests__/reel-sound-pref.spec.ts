/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import { loadReelSoundPref } from "@/components/events/video-player";

describe("loadReelSoundPref", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("defaults to sound off when unset", () => {
    expect(loadReelSoundPref()).toBe(false);
  });

  it("reads the explore session key", () => {
    window.sessionStorage.setItem("tipmanna_yt_explore_sound_on", "1");
    expect(loadReelSoundPref()).toBe(true);
  });
});
