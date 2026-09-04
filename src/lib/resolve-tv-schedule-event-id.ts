/** Resolve event id for TV schedule rows (matches catalog prefetch order). */
export function resolveTvScheduleEventId(
  item:
    | {
        channel?: { eventId?: string | null } | null;
        defaultChannelEventId?: string | null;
      }
    | null
    | undefined
): string {
  if (!item) return "";
  return String(
    item.channel?.eventId ?? item.defaultChannelEventId ?? ""
  ).trim();
}
