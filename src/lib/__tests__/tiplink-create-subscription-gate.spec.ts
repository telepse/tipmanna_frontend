import { describe, expect, it, vi } from "vitest";

import {
  apiSubscriptionLapsedBody,
  apiSubscriptionRequiredBody,
  openTipLinkCreateSubscriptionPrompt,
  shouldPreGateTipLinkCreate,
} from "@/lib/tiplink-create-subscription-gate";
import { mapVideosByEventToHostCreatorEvents } from "@/lib/tiplink-eligible-videos";
import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
} from "@/lib/host-subscription-errors";

describe("tiplink-create-subscription-gate", () => {
  it("api bodies match readApiErrorCode shape", () => {
    expect(isSubscriptionRequiredError(apiSubscriptionRequiredBody())).toBe(
      true
    );
    expect(isSubscriptionLapsedError(apiSubscriptionLapsedBody())).toBe(true);
    expect(isSubscriptionRequiredError({ code: "SUBSCRIPTION_REQUIRED" })).toBe(
      false
    );
  });

  it("shouldPreGateTipLinkCreate only when loaded and not entitled", () => {
    expect(shouldPreGateTipLinkCreate(null)).toBe(false);
    expect(shouldPreGateTipLinkCreate(undefined)).toBe(false);
    expect(shouldPreGateTipLinkCreate({ canCreate: true })).toBe(false);
    expect(shouldPreGateTipLinkCreate({ canCreate: false })).toBe(true);
  });

  it("opens required modal from eligibility when not entitled", () => {
    const openForRequired = vi.fn();
    const openForLapsed = vi.fn();
    const opened = openTipLinkCreateSubscriptionPrompt({
      eligibility: {
        canCreate: false,
        subscriptionStatus: "none",
      },
      openForRequired,
      openForLapsed,
    });
    expect(opened).toBe(true);
    expect(openForRequired).toHaveBeenCalledWith("premium");
    expect(openForLapsed).not.toHaveBeenCalled();
  });

  it("opens lapsed modal when subscriptionStatus is lapsed", () => {
    const openForRequired = vi.fn();
    const openForLapsed = vi.fn();
    openTipLinkCreateSubscriptionPrompt({
      eligibility: {
        canCreate: false,
        subscriptionStatus: "lapsed",
      },
      openForRequired,
      openForLapsed,
    });
    expect(openForLapsed).toHaveBeenCalledWith("premium");
    expect(openForRequired).not.toHaveBeenCalled();
  });

  it("maps videos-by-event rows for TipLink picker", () => {
    const events = mapVideosByEventToHostCreatorEvents(
      [
        {
          id: "ev-1",
          eventName: "Launch",
          channels: [{ id: "ch-1", title: "Intro", url: "https://youtu.be/x" }],
        },
      ],
      "my-host"
    );
    expect(events).toHaveLength(1);
    expect(events[0].eventSlug).toBe("my-host");
    expect(events[0].videos[0].id).toBe("ch-1");
  });
});
