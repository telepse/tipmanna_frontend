import { describe, expect, it, vi } from "vitest";

import {
  applyTayeActiveWithCeremony,
  isOutboundPublishedForCeremony,
  requiresTayeFirstEnableConfirmation,
  TAYE_FIRST_ENABLE_CONFIRM_MESSAGE,
} from "../taye-first-enable-ceremony";

describe("requiresTayeFirstEnableConfirmation", () => {
  it("requires confirm on OFF→ON when partnerReturnedEventId is on meta only", () => {
    expect(
      requiresTayeFirstEnableConfirmation(false, true, {
        direction: undefined,
        partnerReturnedEventId: "partner-ext-1",
      }, null)
    ).toBe(true);
  });

  it("requires confirm when local publish id is set before direction refresh", () => {
    expect(
      requiresTayeFirstEnableConfirmation(false, true, null, "partner-ext-2")
    ).toBe(true);
  });

  it("requires confirm for tipmanna_outbound direction even without publish id yet", () => {
    expect(
      requiresTayeFirstEnableConfirmation(false, true, {
        direction: "tipmanna_outbound",
        partnerReturnedEventId: null,
      }, null)
    ).toBe(true);
  });

  it("does not confirm when turning off", () => {
    expect(
      requiresTayeFirstEnableConfirmation(true, false, {
        direction: "tipmanna_outbound",
        partnerReturnedEventId: "x",
      }, "x")
    ).toBe(false);
  });

  it("does not confirm when already active", () => {
    expect(
      requiresTayeFirstEnableConfirmation(true, true, {
        direction: "tipmanna_outbound",
        partnerReturnedEventId: "x",
      }, "x")
    ).toBe(false);
  });

  it("does not confirm inbound partner room with no outbound publish", () => {
    expect(
      requiresTayeFirstEnableConfirmation(false, true, {
        direction: "partner_inbound",
        partnerReturnedEventId: null,
      }, null)
    ).toBe(false);
  });
});

describe("isOutboundPublishedForCeremony", () => {
  it("is true when either source has partner id", () => {
    expect(
      isOutboundPublishedForCeremony(
        { partnerReturnedEventId: "a" },
        null
      )
    ).toBe(true);
    expect(isOutboundPublishedForCeremony(null, "b")).toBe(true);
  });
});

describe("applyTayeActiveWithCeremony", () => {
  it("does not activate when user cancels confirm", async () => {
    const activate = vi.fn().mockResolvedValue(true);
    const result = await applyTayeActiveWithCeremony({
      next: true,
      currentlyActive: false,
      meta: { partnerReturnedEventId: "p1", direction: undefined },
      publishedPartnerEventId: null,
      confirm: () => false,
      activate,
    });
    expect(result).toEqual({ applied: false, userConfirmed: false });
    expect(activate).not.toHaveBeenCalled();
  });

  it("activates after confirm", async () => {
    const activate = vi.fn().mockResolvedValue(true);
    const confirm = vi.fn().mockReturnValue(true);
    const result = await applyTayeActiveWithCeremony({
      next: true,
      currentlyActive: false,
      meta: { partnerReturnedEventId: "p1" },
      publishedPartnerEventId: null,
      confirm,
      activate,
    });
    expect(confirm).toHaveBeenCalledWith(TAYE_FIRST_ENABLE_CONFIRM_MESSAGE);
    expect(activate).toHaveBeenCalledWith(true);
    expect(result.applied).toBe(true);
  });

  it("activates without confirm when already on", async () => {
    const activate = vi.fn().mockResolvedValue(true);
    await applyTayeActiveWithCeremony({
      next: true,
      currentlyActive: true,
      meta: { partnerReturnedEventId: "p1" },
      publishedPartnerEventId: "p1",
      confirm: () => {
        throw new Error("should not confirm");
      },
      activate,
    });
    expect(activate).toHaveBeenCalledWith(true);
  });
});
