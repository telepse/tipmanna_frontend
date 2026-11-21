import { describe, expect, it } from "vitest";
import {
  reconcileVenueScreenSettingsFromPersisted,
  venueProgressToggleForSave,
  venueProgressToggleFromPersisted,
} from "@/lib/persisted-screen-settings";

describe("persisted screen settings", () => {
  it("maps persisted hide flag to show toggle checked state", () => {
    expect(venueProgressToggleFromPersisted(false)).toEqual({
      hideProgressAmount: false,
      showAmountChecked: true,
    });
    expect(venueProgressToggleFromPersisted(true)).toEqual({
      hideProgressAmount: true,
      showAmountChecked: false,
    });
  });

  it("maps show toggle to hide flag for save", () => {
    expect(venueProgressToggleForSave(true)).toBe(false);
    expect(venueProgressToggleForSave(false)).toBe(true);
  });

  it("reconciles only defined persisted fields", () => {
    const base = {
      hideProgressBarAmount: true,
      showLatestAmount: false,
      eventBackground: "/default.png",
    };
    expect(
      reconcileVenueScreenSettingsFromPersisted(base, {
        hideProgressBarAmount: false,
      })
    ).toEqual({
      hideProgressBarAmount: false,
      showLatestAmount: false,
      eventBackground: "/default.png",
    });
    expect(reconcileVenueScreenSettingsFromPersisted(base, {})).toEqual(base);
  });
});
