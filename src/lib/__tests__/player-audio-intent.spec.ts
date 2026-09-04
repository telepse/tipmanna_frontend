import { describe, expect, it } from "vitest";
import { shouldSuppressPlayerMuteSync } from "@/lib/player-audio-intent";

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
