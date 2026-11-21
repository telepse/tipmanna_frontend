import { describe, expect, it } from "vitest";
import { mapHostEventToScreenSettingsSnapshot } from "@/lib/host-event-screen-settings";

describe("host event screen settings snapshot", () => {
  it("maps persisted hideProgressBarAmount without inversion", () => {
    const snap = mapHostEventToScreenSettingsSnapshot({
      eventBackground: "/gaming.png",
      moneyFor: "Charity",
      showLatestAmount: true,
      hideProgressBarAmount: true,
      showPinnedOnScreen: false,
      funnelPosition: "top_right",
      performers: [],
      projects: [],
      tipUsageDisclosure: [],
    });
    expect(snap.hideProgressAmount).toBe(true);
    expect(snap.background).toBe("/gaming.png");
    expect(snap.funnelPosition).toBe("top_right");
  });
});
