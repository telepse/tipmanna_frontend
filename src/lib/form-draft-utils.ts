import type { NewEventFormData } from "@/schemas";
import type { AddVideoFormValues } from "@/components/events/add-video-form";

type VideoPolicySlice = {
  ownershipAnswer?: "yes" | "no";
  coOwnerDraftKey?: string;
  onYoutubeChannelSlot?: number | null;
  isOnHostYoutube?: boolean;
};

type VideoLinkItem = NonNullable<NewEventFormData["videoLinks"]>[number];
type VideoLinkPayloadItem = Omit<VideoLinkItem, keyof VideoPolicySlice>;

const VIDEO_LINK_POLICY_KEYS = [
  "ownershipAnswer",
  "coOwnerDraftKey",
  "onYoutubeChannelSlot",
  "isOnHostYoutube",
] as const satisfies readonly (keyof VideoPolicySlice)[];

function stripVideoLinkPolicy(link: VideoLinkItem): VideoLinkPayloadItem {
  const rest = { ...link };
  for (const key of VIDEO_LINK_POLICY_KEYS) {
    delete rest[key];
  }
  return rest;
}

export type FormDraftPolicyJson = {
  videoLinks?: VideoPolicySlice[];
  verifyStatus?: Record<string, "idle" | "checking" | "verified" | "failed">;
  modal?: {
    ownershipAnswer?: "yes" | "no";
    coOwnerDraftKey?: string;
    hostYoutubeSlot?: "none" | "1" | "2";
  };
};

/** Split policy fields for separate draft storage (co-owner keys, ownership answers). */
export function splitDraftPayload(payload: NewEventFormData): {
  payloadJson: NewEventFormData;
  policyJson: FormDraftPolicyJson;
} {
  const videoLinks = payload.videoLinks ?? [];
  const policyVideoLinks: VideoPolicySlice[] = videoLinks.map(link => {
    const slice: VideoPolicySlice = {};
    if (link.ownershipAnswer === "yes" || link.ownershipAnswer === "no") {
      slice.ownershipAnswer = link.ownershipAnswer;
    }
    if (link.coOwnerDraftKey != null && link.coOwnerDraftKey !== "") {
      slice.coOwnerDraftKey = link.coOwnerDraftKey;
    }
    if (link.onYoutubeChannelSlot != null) {
      slice.onYoutubeChannelSlot = link.onYoutubeChannelSlot;
    }
    if (link.isOnHostYoutube) {
      slice.isOnHostYoutube = true;
    }
    return slice;
  });

  const payloadJson: NewEventFormData = {
    ...payload,
    videoLinks: videoLinks.map(stripVideoLinkPolicy),
  };

  return {
    payloadJson,
    policyJson: { videoLinks: policyVideoLinks },
  };
}

/** Merge saved policy slice back into form defaults on restore. */
export function mergeDraftPayload(
  payloadJson: unknown,
  policyJson: unknown
): NewEventFormData {
  const base = (payloadJson ?? {}) as NewEventFormData;
  const policy = (policyJson ?? {}) as FormDraftPolicyJson;
  const links = Array.isArray(base.videoLinks) ? base.videoLinks : [];

  if (!Array.isArray(policy.videoLinks) || policy.videoLinks.length === 0) {
    return base;
  }

  return {
    ...base,
    videoLinks: links.map((link, i) => ({
      ...link,
      ownershipAnswer:
        policy.videoLinks?.[i]?.ownershipAnswer ?? link.ownershipAnswer,
      coOwnerDraftKey:
        policy.videoLinks?.[i]?.coOwnerDraftKey ??
        link.coOwnerDraftKey ??
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : ""),
      onYoutubeChannelSlot:
        policy.videoLinks?.[i]?.onYoutubeChannelSlot ??
        link.onYoutubeChannelSlot ??
        null,
      isOnHostYoutube:
        policy.videoLinks?.[i]?.isOnHostYoutube ??
        link.isOnHostYoutube ??
        false,
    })),
  };
}

/** Split modal add-video form for draft storage. */
export function splitModalDraftPayload(payload: AddVideoFormValues): {
  payloadJson: Omit<
    AddVideoFormValues,
    "ownershipAnswer" | "coOwnerDraftKey" | "hostYoutubeSlot"
  >;
  policyJson: FormDraftPolicyJson;
} {
  const { ownershipAnswer, coOwnerDraftKey, hostYoutubeSlot, ...rest } =
    payload;
  return {
    payloadJson: rest,
    policyJson: {
      modal: { ownershipAnswer, coOwnerDraftKey, hostYoutubeSlot },
    },
  };
}

/** Merge modal draft policy back into form values. */
export function mergeModalDraftPayload(
  payloadJson: unknown,
  policyJson: unknown
): AddVideoFormValues {
  const base = (payloadJson ?? {}) as Partial<AddVideoFormValues>;
  const policy = (policyJson ?? {}) as FormDraftPolicyJson;
  const modal = policy.modal ?? {};
  return {
    title: base.title ?? "",
    description: base.description ?? "",
    url: base.url ?? "",
    isLive: base.isLive ?? false,
    setReminder: base.setReminder ?? false,
    reminders: base.reminders ?? {},
    contentLanguage: base.contentLanguage ?? "en-GB",
    contentCountry: base.contentCountry ?? "all",
    eventVideoType: base.eventVideoType ?? "__inherit__",
    hostYoutubeSlot: modal.hostYoutubeSlot ?? base.hostYoutubeSlot ?? "none",
    ownershipAnswer: modal.ownershipAnswer ?? base.ownershipAnswer,
    coOwnerDraftKey: modal.coOwnerDraftKey ?? base.coOwnerDraftKey ?? "",
  };
}

export function modalDraftStorageKey(kind: string, targetId: string): string {
  return `formDraft:${kind}:${targetId}`;
}
