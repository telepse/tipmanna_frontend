import { toast } from "react-toastify";
import type { UseFormReturn } from "react-hook-form";
import type { NewEventFormData } from "@/schemas";

export type PrivacyVideoLink = NonNullable<
  NewEventFormData["videoLinks"]
>[number];

type Options = {
  links: PrivacyVideoLink[];
  hasActivePremium?: boolean;
  liveVideoLink?: string | null;
};

/** Run privacy checks from a create-event form + active premium subscription. */
export function runPrivacyChecksFromForm(
  form: Pick<UseFormReturn<NewEventFormData>, "getValues">,
  hasActivePremium?: boolean
): boolean {
  return validatePrivacyVideoLinks({
    links: form.getValues("videoLinks") ?? [],
    hasActivePremium,
    liveVideoLink: form.getValues("liveVideoLink"),
  });
}

/** Resolve ownership attestation for a live stream URL from videoLinks or explicit field. */
export function resolveLiveVideoOwnershipAnswer(values: {
  liveVideoLink?: string | null;
  liveVideoOwnershipAnswer?: "yes" | "no" | null;
  videoLinks?: PrivacyVideoLink[] | null;
}): "yes" | "no" | undefined {
  if (
    values.liveVideoOwnershipAnswer === "yes" ||
    values.liveVideoOwnershipAnswer === "no"
  ) {
    return values.liveVideoOwnershipAnswer;
  }
  const live = values.liveVideoLink?.trim();
  if (!live) return undefined;
  const match = values.videoLinks?.find(v => v.url?.trim() === live);
  if (match?.ownershipAnswer === "yes" || match?.ownershipAnswer === "no") {
    return match.ownershipAnswer;
  }
  return undefined;
}

/** Client-side co-owner / default-video checks before privacy step or submit. */
export function validatePrivacyVideoLinks({
  links,
  hasActivePremium = false,
  liveVideoLink,
}: Options): boolean {
  for (let i = 0; i < links.length; i++) {
    const v = links[i];
    if (!v.url?.trim()) continue;
    if (v.ownershipAnswer !== "yes" && v.ownershipAnswer !== "no") {
      toast.error(
        `Please confirm ownership for video ${i + 1} on the privacy step`
      );
      return false;
    }
    if (v.ownershipAnswer === "no" && !hasActivePremium) {
      toast.error(
        "Upgrade to Host Growth or Host Community for co-owned videos"
      );
      return false;
    }
    if (
      v.ownershipAnswer === "yes" &&
      (v.onYoutubeChannelSlot === 1 || v.onYoutubeChannelSlot === 2) &&
      !v.isOnHostYoutube
    ) {
      toast.error(
        `Verify video ${i + 1} on YouTube channel slot ${v.onYoutubeChannelSlot} before continuing`
      );
      return false;
    }
  }

  const live = liveVideoLink?.trim();
  if (live) {
    const liveOwnership = resolveLiveVideoOwnershipAnswer({
      liveVideoLink: live,
      videoLinks: links,
    });
    if (liveOwnership !== "yes" && liveOwnership !== "no") {
      toast.error(
        "Please confirm ownership for the live stream on the privacy step"
      );
      return false;
    }
    if (liveOwnership === "no" && !hasActivePremium) {
      toast.error(
        "Upgrade to Host Growth or Host Community for co-owned live streams"
      );
      return false;
    }
  }

  return true;
}
