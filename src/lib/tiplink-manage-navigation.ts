export function buildTipLinkManageHref(
  hostEventSlug: string,
  eventId: string,
  channelId?: string
): string {
  const base = `/host/${hostEventSlug}/manage-event/${eventId}?tab=tiplink`;
  return channelId
    ? `${base}&channelId=${encodeURIComponent(channelId)}`
    : base;
}
