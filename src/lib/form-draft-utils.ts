import type { NewEventFormData } from "@/schemas";
import type { AddVideoFormValues } from "@/components/events/add-video-form";

export type CoOwnerDraftSlice = {
  name?: string;
  email?: string;
  payoutPercent?: number;
};

export type VideoPolicySlice = {
  ownershipAnswer?: "yes" | "no";
  coOwnerDraftKey?: string;
  onYoutubeChannelSlot?: number | null;
  isOnHostYoutube?: boolean;
  coOwner?: CoOwnerDraftSlice;
};

type VideoLinkItem = NonNullable<NewEventFormData["videoLinks"]>[number];
type VideoLinkPayloadItem = Omit<
  VideoLinkItem,
  keyof VideoPolicySlice | "coOwner"
>;

const VIDEO_LINK_POLICY_KEYS = [
  "ownershipAnswer",
  "coOwnerDraftKey",
  "onYoutubeChannelSlot",
  "isOnHostYoutube",
  "coOwner",
] as const satisfies readonly (keyof VideoPolicySlice)[];

function stripVideoLinkPolicy(link: VideoLinkItem): VideoLinkPayloadItem {
  const rest = { ...link };
  for (const key of VIDEO_LINK_POLICY_KEYS) {
    delete rest[key];
  }
  return rest;
}

export type DraftResumeOrigin = {
  surface:
    | "create_dialog"
    | "host_community"
    | "event_channel_modal"
    | "content_room_settings";
  pathname: string;
  hostTab?: "event" | "owner" | "cocreator";
  targetId: string;
};

export type FormDraftPolicyJson = {
  videoLinks?: VideoPolicySlice[];
  verifyStatus?: Record<string, "idle" | "checking" | "verified" | "failed">;
  modal?: {
    ownershipAnswer?: "yes" | "no";
    coOwnerDraftKey?: string;
    hostYoutubeSlot?: "none" | "1" | "2";
    targetId?: string;
    origin?: DraftResumeOrigin;
    coOwner?: CoOwnerDraftSlice;
    recoverable?: boolean;
  };
};

function mergeCoOwnerDraftKeyFromPolicy(
  ...candidates: (string | null | undefined)[]
): string {
  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

/** Stable co-owner draft key for invite correlation. Single mint entry point. */
export function mintCoOwnerDraftKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}`;
}

/** Mint only when lifecycle is ready and no key exists yet. */
export function ensureCoOwnerDraftKey(existing?: string | null): string {
  const trimmed = existing?.trim();
  if (trimmed) return trimmed;
  return mintCoOwnerDraftKey();
}

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
    if (link.coOwner) {
      const co: CoOwnerDraftSlice = {};
      if (link.coOwner.name?.trim()) co.name = link.coOwner.name.trim();
      if (link.coOwner.email?.trim()) co.email = link.coOwner.email.trim();
      if (
        typeof link.coOwner.payoutPercent === "number" &&
        !Number.isNaN(link.coOwner.payoutPercent)
      ) {
        co.payoutPercent = link.coOwner.payoutPercent;
      }
      if (Object.keys(co).length > 0) slice.coOwner = co;
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

/** Merge saved policy slice back into form defaults on restore. Never mints keys. */
export function mergeDraftPayload(
  payloadJson: unknown,
  policyJson: unknown
): NewEventFormData {
  const base = (payloadJson ?? {}) as NewEventFormData & {
    cohosts?: Array<{
      email?: string;
      fullName?: string;
      fullname?: string;
    }>;
  };
  const policy = (policyJson ?? {}) as FormDraftPolicyJson;
  const links = Array.isArray(base.videoLinks) ? base.videoLinks : [];
  const cohosts = Array.isArray(base.cohosts)
    ? base.cohosts.map(cohost => ({
        email: cohost.email ?? "",
        fullName: (cohost.fullName ?? cohost.fullName ?? "").trim(),
      }))
    : base.cohosts;

  const mergedBase: NewEventFormData = {
    ...base,
    cohosts,
  };

  if (!Array.isArray(policy.videoLinks) || policy.videoLinks.length === 0) {
    return mergedBase;
  }

  return {
    ...mergedBase,
    videoLinks: links.map((link, i) => {
      const policySlice = policy.videoLinks?.[i];
      return {
        ...link,
        ownershipAnswer: policySlice?.ownershipAnswer ?? link.ownershipAnswer,
        coOwnerDraftKey: mergeCoOwnerDraftKeyFromPolicy(
          policySlice?.coOwnerDraftKey,
          link.coOwnerDraftKey
        ),
        onYoutubeChannelSlot:
          policySlice?.onYoutubeChannelSlot ??
          link.onYoutubeChannelSlot ??
          null,
        isOnHostYoutube:
          policySlice?.isOnHostYoutube ?? link.isOnHostYoutube ?? false,
        coOwner: policySlice?.coOwner ?? link.coOwner,
      };
    }),
  };
}

/** Split modal add-video form for draft storage. */
export function splitModalDraftPayload(payload: AddVideoFormValues): {
  payloadJson: Omit<
    AddVideoFormValues,
    "ownershipAnswer" | "coOwnerDraftKey" | "hostYoutubeSlot" | "coOwner"
  >;
  policyJson: FormDraftPolicyJson;
} {
  const {
    ownershipAnswer,
    coOwnerDraftKey,
    hostYoutubeSlot,
    coOwner,
    ...rest
  } = payload;
  const modalPolicy: NonNullable<FormDraftPolicyJson["modal"]> = {
    ownershipAnswer,
    coOwnerDraftKey,
    hostYoutubeSlot,
  };
  if (coOwner) {
    const co: CoOwnerDraftSlice = {};
    if (coOwner.name?.trim()) co.name = coOwner.name.trim();
    if (coOwner.email?.trim()) co.email = coOwner.email.trim();
    if (
      typeof coOwner.payoutPercent === "number" &&
      !Number.isNaN(coOwner.payoutPercent)
    ) {
      co.payoutPercent = coOwner.payoutPercent;
    }
    if (Object.keys(co).length > 0) modalPolicy.coOwner = co;
  }
  return {
    payloadJson: rest,
    policyJson: { modal: modalPolicy },
  };
}

/** Merge modal draft policy back into form values. Never mints keys. */
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
    coOwnerDraftKey: mergeCoOwnerDraftKeyFromPolicy(
      modal.coOwnerDraftKey,
      base.coOwnerDraftKey
    ),
    coOwner: modal.coOwner ?? base.coOwner,
  };
}

export function modalDraftStorageKey(kind: string, targetId: string): string {
  return `formDraft:${kind}:${targetId}`;
}

export function isModalDraftRecoverable(policyJson: unknown): boolean {
  const policy = (policyJson ?? {}) as FormDraftPolicyJson;
  if (policy.modal?.recoverable === false) return false;
  const targetId = policy.modal?.targetId?.trim();
  const origin = policy.modal?.origin;
  if (targetId || origin?.targetId?.trim()) return true;
  return false;
}
