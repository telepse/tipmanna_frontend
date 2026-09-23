import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";
import type { ProgramBootstrap } from "@/lib/program-types";

export function resolveProgramOgImageUrl(
  program: Pick<ProgramBootstrap, "landingBannerUrl" | "items">
): string | null {
  if (program.landingBannerUrl?.trim()) {
    return program.landingBannerUrl.trim();
  }

  const contentUrl = program.items.find(i => i.contentUrl?.trim())?.contentUrl;
  if (contentUrl?.trim()) {
    return getYoutubeThumbnail(contentUrl.trim());
  }

  return null;
}
