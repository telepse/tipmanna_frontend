import { describe, expect, it } from "vitest";

import { resolveChannelTipIdsForSurface } from "../room-overlay-tip-ids";

describe("room-overlay-tip-ids", () => {
  it("event_room clears paymentChannelId but keeps feature card channel id", () => {
    expect(resolveChannelTipIdsForSurface("event_room", "ch-99")).toEqual({
      paymentChannelIdForTip: null,
      featureCardChannelId: "ch-99",
    });
  });

  it("channel_client uses channel id for tips and feature card", () => {
    expect(resolveChannelTipIdsForSurface("channel_client", "ch-1")).toEqual({
      paymentChannelIdForTip: "ch-1",
      featureCardChannelId: "ch-1",
    });
  });

  it("empty active channel yields null ids", () => {
    expect(resolveChannelTipIdsForSurface("event_room", null)).toEqual({
      paymentChannelIdForTip: null,
      featureCardChannelId: null,
    });
  });
});
