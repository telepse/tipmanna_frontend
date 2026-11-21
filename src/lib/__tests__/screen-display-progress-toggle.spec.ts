import { describe, expect, it } from "vitest";
import {
  hideProgressBarAmountFromShowToggle,
  progressBarAmountVisible,
  showAmountOnProgressBarToggleChecked,
} from "@/lib/screen-display-progress-toggle";

describe("screen display progress amount toggle", () => {
  it("shows amounts when hide flag is false or unset", () => {
    expect(progressBarAmountVisible(false)).toBe(true);
    expect(progressBarAmountVisible(undefined)).toBe(true);
    expect(progressBarAmountVisible(null)).toBe(true);
  });

  it("hides amounts when hide flag is true", () => {
    expect(progressBarAmountVisible(true)).toBe(false);
  });

  it("maps host show toggle to hideProgressBarAmount for save", () => {
    expect(showAmountOnProgressBarToggleChecked(false)).toBe(true);
    expect(showAmountOnProgressBarToggleChecked(true)).toBe(false);
    expect(hideProgressBarAmountFromShowToggle(true)).toBe(false);
    expect(hideProgressBarAmountFromShowToggle(false)).toBe(true);
  });
});
