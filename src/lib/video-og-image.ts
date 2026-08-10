import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";

export function resolveVideoOgImageUrl(
  videoUrl: string | null | undefined
): string | null {
  if (!videoUrl?.trim()) return null;
  return getYoutubeThumbnail(videoUrl.trim());
}

export function buildOgImageMetadata(imageUrl: string | null | undefined) {
  if (!imageUrl?.trim()) return {};
  const url = imageUrl.trim();
  return {
    openGraph: {
      images: [{ url, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image" as const,
      images: [url],
    },
  };
}
