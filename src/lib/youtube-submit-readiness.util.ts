import type { NewEventFormData } from "@/schemas";

export type YoutubeVerifyUiState = "idle" | "checking" | "verified" | "failed";

type VideoLink = NonNullable<NewEventFormData["videoLinks"]>[number];

/** True only while verify is in flight for a selected host channel slot. */
export function isYoutubeVerifyBlockingSubmit(
  videoLinks: VideoLink[] | undefined,
  verifyStatus: Record<number, YoutubeVerifyUiState>
): boolean {
  if (!videoLinks?.length) return false;
  return videoLinks.some((link, i) => {
    if (verifyStatus[i] !== "checking") return false;
    const slot = link.onYoutubeChannelSlot;
    return slot === 1 || slot === 2;
  });
}

export function youtubeVerifyBlockingMessage(
  videoLinks: VideoLink[] | undefined,
  verifyStatus: Record<number, YoutubeVerifyUiState>
): string | null {
  if (!videoLinks?.length) return null;
  for (let i = 0; i < videoLinks.length; i++) {
    const link = videoLinks[i]!;
    const slot = link.onYoutubeChannelSlot;
    if (verifyStatus[i] !== "checking") continue;
    if (slot !== 1 && slot !== 2) continue;
    return "Verifying on YouTube…";
  }
  return null;
}
