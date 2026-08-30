import type { NewEventFormData } from "@/schemas";

export type YoutubeVerifyUiState = "idle" | "checking" | "verified" | "failed";

type VideoLink = NonNullable<NewEventFormData["videoLinks"]>[number];

/** True when submit must wait for YouTube verification to finish or succeed. */
export function isYoutubeVerifyBlockingSubmit(
  videoLinks: VideoLink[] | undefined,
  verifyStatus: Record<number, YoutubeVerifyUiState>
): boolean {
  if (!videoLinks?.length) return false;
  return videoLinks.some((link, i) => {
    const slot = link.onYoutubeChannelSlot;
    if (slot !== 1 && slot !== 2) return false;
    if (link.ownershipAnswer !== "yes") return false;
    const status = verifyStatus[i];
    if (status === "checking") return true;
    if (status === "verified" || link.isOnHostYoutube) return false;
    return true;
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
    if (slot !== 1 && slot !== 2) continue;
    if (link.ownershipAnswer !== "yes") continue;
    const status = verifyStatus[i];
    if (status === "checking") {
      return "Verifying on YouTube…";
    }
    if (status !== "verified" && !link.isOnHostYoutube) {
      return "Verify the video on your YouTube channel before submitting";
    }
  }
  return null;
}
