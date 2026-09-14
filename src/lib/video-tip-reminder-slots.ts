export const VIDEO_TIP_REMINDER_UI_SLOTS = 3;
export const VIDEO_TIP_REMINDER_RESERVED_SLOT = 3;

/** Free hosts: 1 active slot. Growth/Community: 2. Third slot is reserved in UI. */
export function maxVideoTipReminderSlotsForTier(
  hasActivePremium: boolean
): number {
  return hasActivePremium ? 2 : 1;
}

export function isVideoTipReminderSlotLocked(
  slotIndex: number,
  hasActivePremium: boolean
): boolean {
  if (slotIndex === VIDEO_TIP_REMINDER_RESERVED_SLOT - 1) return true;
  return slotIndex >= maxVideoTipReminderSlotsForTier(hasActivePremium);
}
