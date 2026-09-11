import { describe, expect, it } from "vitest";
import {
  shouldReapplySessionMute,
  shouldSuppressPlayerMuteSync,
} from "@/lib/player-audio-intent";

describe("shouldSuppressPlayerMuteSync", () => {
  it("suppresses when player is muted but session pref is unmuted and unlocked", () => {
    expect(shouldSuppressPlayerMuteSync(true, false, true)).toBe(true);
  });

  it("does not suppress when pref matches player muted", () => {
    expect(shouldSuppressPlayerMuteSync(true, true, true)).toBe(false);
  });

  it("does not suppress when session is not unlocked", () => {
    expect(shouldSuppressPlayerMuteSync(true, false, false)).toBe(false);
  });

  it("does not suppress when player reports unmuted", () => {
    expect(shouldSuppressPlayerMuteSync(false, false, true)).toBe(false);
  });
});

describe("shouldReapplySessionMute", () => {
  it("returns true when YouTube unmuted but session pref is muted", () => {
    expect(shouldReapplySessionMute(false, true)).toBe(true);
  });

  it("returns false when player and pref agree", () => {
    expect(shouldReapplySessionMute(true, true)).toBe(false);
    expect(shouldReapplySessionMute(false, false)).toBe(false);
  });
});
