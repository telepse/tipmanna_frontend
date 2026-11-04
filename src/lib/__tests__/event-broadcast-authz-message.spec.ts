import { describe, expect, it } from "vitest";

import {
  formatEventOwnershipDeniedMessage,
  isEventOwnershipDeniedMessage,
} from "@/lib/event-broadcast-authz-message";

describe("event-broadcast-authz-message", () => {
  it("detects ownership 403 message from API", () => {
    expect(
      isEventOwnershipDeniedMessage("Not authorized for this event", 403)
    ).toBe(true);
    expect(isEventOwnershipDeniedMessage("Rate limited", 429)).toBe(false);
    expect(
      isEventOwnershipDeniedMessage("Forbidden: insufficient permissions", 403)
    ).toBe(false);
  });

  it("formats an actionable wrong-host / wrong-fixture message", () => {
    const text = formatEventOwnershipDeniedMessage({
      hostSlug: "b1e2e_1c0d9c7c",
      eventId: "be962849-e3c4-44f8-887f-9ae76a1d056d",
    });
    expect(text).toMatch(/Not authorized for this event/);
    expect(text).toContain("b1e2e_1c0d9c7c");
    expect(text).toContain("be962849-e3c4-44f8-887f-9ae76a1d056d");
    expect(text).toMatch(/restore fixture/i);
    expect(text).not.toMatch(/b1e2e_cbdc5ed6/);
  });
});
