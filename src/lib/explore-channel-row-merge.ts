/** Prefer API event fields (amountToRaise, flags) while keeping Discover list playback fields. */
export function mergeExploreChannelRows(
  primary: Record<string, unknown>,
  secondary?: Record<string, unknown> | null
): Record<string, unknown> {
  if (!secondary) return primary;
  const primaryEvent =
    primary.event && typeof primary.event === "object"
      ? (primary.event as Record<string, unknown>)
      : {};
  const secondaryEvent =
    secondary.event && typeof secondary.event === "object"
      ? (secondary.event as Record<string, unknown>)
      : {};
  return {
    ...secondary,
    ...primary,
    event: { ...secondaryEvent, ...primaryEvent },
  };
}
