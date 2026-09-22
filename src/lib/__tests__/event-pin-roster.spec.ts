import { describe, expect, it } from "vitest";

import {
  applyPinnedAmountSnapshot,
  MAX_PINNED_ROSTER_ITEMS,
  pinnedForScreenDisplay,
  pinnedRosterItems,
} from "@/lib/event-pin-roster";

describe("event pin roster helpers", () => {
  it("returns only pinned items up to the max", () => {
    const items = [
      { id: "1", name: "One", isPinned: true },
      { id: "2", name: "Two", isPinned: true },
      { id: "3", name: "Three", isPinned: true },
    ];

    expect(pinnedRosterItems(items)).toHaveLength(MAX_PINNED_ROSTER_ITEMS);
  });

  it("treats legacy rows without isPinned as displayable", () => {
    expect(
      pinnedForScreenDisplay([{ name: "Legacy" }, { name: "Also legacy" }])
    ).toHaveLength(2);
  });

  it("filters unpinned rows when pin flags exist", () => {
    expect(
      pinnedForScreenDisplay([
        { name: "Hidden", isPinned: false },
        { name: "Visible", isPinned: true },
      ])
    ).toEqual([{ name: "Visible", isPinned: true }]);
  });

  it("applyPinnedAmountSnapshot clears pins without shrinking roster", () => {
    const full = [
      { id: "a", name: "A", isPinned: true, amountReceived: 1 },
      { id: "b", name: "B", isPinned: true, amountReceived: 2 },
      { id: "c", name: "C", isPinned: false, amountReceived: 0 },
    ];
    const merged = applyPinnedAmountSnapshot(full, []);
    expect(merged).toHaveLength(3);
    expect(merged.every(row => row.isPinned === false)).toBe(true);
    expect(pinnedForScreenDisplay(merged)).toHaveLength(0);
  });

  it("applyPinnedAmountSnapshot updates pinned row amounts", () => {
    const full = [
      { id: "a", name: "A", isPinned: false },
      { id: "b", name: "B", isPinned: true },
    ];
    const merged = applyPinnedAmountSnapshot(full, [
      { id: "a", name: "A", amountReceived: 50 },
    ]);
    expect(merged[0]).toMatchObject({
      id: "a",
      isPinned: true,
      amountReceived: 50,
    });
    expect(merged[1]).toMatchObject({ id: "b", isPinned: false });
  });
});
