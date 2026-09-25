import { describe, expect, it } from "vitest";

import { shouldDeferHostEventMessagesForTab } from "../manage-event-first-paint";

describe("manage-event-first-paint", () => {
  it("defers messages only for tiplink tab", () => {
    expect(shouldDeferHostEventMessagesForTab("tiplink")).toBe(true);
    expect(shouldDeferHostEventMessagesForTab(" event_info ")).toBe(false);
    expect(shouldDeferHostEventMessagesForTab(null)).toBe(false);
  });
});
