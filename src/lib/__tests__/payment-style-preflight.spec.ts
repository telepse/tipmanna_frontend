import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payment-animation-trace", () => ({
  tracePaymentAnimation: vi.fn(),
  tracePaymentAnimationError: vi.fn(),
}));

import { isKnownAnimationStyleName } from "@/lib/animation-style-registry";
import {
  preflightPaymentCharacterStyles,
  validatePaymentCharacterStyle,
} from "@/lib/payment-style-preflight";

describe("payment style preflight (Phase E3A)", () => {
  const context = {
    eventId: "evt-1",
    bundleId: "bundle-1",
    seq: 1,
    surface: "room_messages",
    buildPlaybackKey: (name: string) => `bundle-1-${name}`,
  };

  it("Test E — exact-case validation against canonical registry keys", () => {
    expect(isKnownAnimationStyleName("Confetti")).toBe(true);
    expect(isKnownAnimationStyleName("confetti")).toBe(false);
    expect(isKnownAnimationStyleName(" Confe")).toBe(false);
    expect(isKnownAnimationStyleName("Confe ")).toBe(false);
    expect(isKnownAnimationStyleName("Confe")).toBe(false);
    expect(isKnownAnimationStyleName("Confett")).toBe(false);
  });

  it("accepts canonical exact keys", () => {
    const outcome = validatePaymentCharacterStyle(
      { name: "Love", iconUrl: "/love.png", styleName: "Confetti" },
      context
    );
    expect(outcome.accepted).toBe(true);
  });

  it("rejects unknown style with typed failure", () => {
    const outcome = validatePaymentCharacterStyle(
      { name: "Love", iconUrl: "/love.png", styleName: "Confe" },
      context
    );
    expect(outcome.accepted).toBe(false);
    if (!outcome.accepted) {
      expect(outcome.rejection).toEqual({
        reason: "unknown_style",
        characterName: "Love",
        styleName: "Confe",
        playbackKey: "bundle-1-Love",
        eventId: "evt-1",
        bundleId: "bundle-1",
        seq: 1,
        surface: "room_messages",
      });
    }
  });

  it("Test D — all invalid characters produce no runnable set", () => {
    const result = preflightPaymentCharacterStyles(
      [
        { name: "A", iconUrl: "/a.png", styleName: "Confe" },
        { name: "B", iconUrl: "/b.png", styleName: "Shock" },
      ],
      context
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.rejections).toHaveLength(2);
    expect(result.rejections.every(r => r.reason === "unknown_style")).toBe(
      true
    );
  });
});
