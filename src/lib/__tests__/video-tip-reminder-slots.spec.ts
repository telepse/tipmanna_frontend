import { describe, expect, it } from "vitest";

import {
  isVideoTipReminderSlotLocked,
  maxVideoTipReminderSlotsForTier,
} from "@/lib/video-tip-reminder-slots";

describe("video-tip-reminder-slots", () => {
  it("allows one slot on free tier", () => {
    expect(maxVideoTipReminderSlotsForTier(false)).toBe(1);
    expect(isVideoTipReminderSlotLocked(0, false)).toBe(false);
    expect(isVideoTipReminderSlotLocked(1, false)).toBe(true);
    expect(isVideoTipReminderSlotLocked(2, false)).toBe(true);
  });

  it("allows two slots on premium and reserves the third", () => {
    expect(maxVideoTipReminderSlotsForTier(true)).toBe(2);
    expect(isVideoTipReminderSlotLocked(0, true)).toBe(false);
    expect(isVideoTipReminderSlotLocked(1, true)).toBe(false);
    expect(isVideoTipReminderSlotLocked(2, true)).toBe(true);
  });
});
