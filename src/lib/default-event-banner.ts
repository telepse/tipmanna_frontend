/** System default event banner — hosts may replace; URL remains as undeletable fallback. */
export const DEFAULT_EVENT_BANNER_URL =
  "https://res.cloudinary.com/tipmanna/image/upload/v1786171632/event_banner_hcqybl.webp";

export function isDefaultEventBanner(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return true;
  return trimmed === DEFAULT_EVENT_BANNER_URL;
}
