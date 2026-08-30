import { resolveVideoOgImageUrl } from "@/lib/video-og-image";

/**
 * OG image for event room shares: YouTube thumbnail when default video has a URL,
 * otherwise event banner. Never returns a bare YouTube video id.
 */
export function resolveRoomOgImage(
  defaultVideoUrl: string | null | undefined,
  eventBanner: string | null | undefined
): string {
  const fromVideo = resolveVideoOgImageUrl(defaultVideoUrl);
  if (fromVideo) return fromVideo;
  const banner = eventBanner?.trim();
  return banner || "";
}
