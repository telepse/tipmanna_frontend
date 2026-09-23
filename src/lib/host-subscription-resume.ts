const STORAGE_KEY = "host_subscription_resume";

export type HostSubscriptionResumeKind =
  | "create-playlist"
  | "change-photo"
  | "external-link"
  | "create-tiplink-draft"
  | "return-path";

export type HostSubscriptionResume = {
  kind: HostSubscriptionResumeKind;
  returnPath: string;
  /** Set when kind is create-tiplink-draft */
  channelId?: string;
  eventId?: string;
  title?: string;
};

const VALID_KINDS = new Set<string>([
  "create-playlist",
  "change-photo",
  "external-link",
  "create-tiplink-draft",
  "return-path",
]);

function isValidKind(k: string): k is HostSubscriptionResumeKind {
  return VALID_KINDS.has(k);
}

export function setHostSubscriptionResume(
  payload: HostSubscriptionResume
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekHostSubscriptionResume(): HostSubscriptionResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HostSubscriptionResume;
    if (!parsed?.returnPath || !isValidKind(parsed.kind)) return null;
    if (
      parsed.kind === "create-tiplink-draft" &&
      typeof parsed.channelId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function consumeHostSubscriptionResume(): HostSubscriptionResume | null {
  const payload = peekHostSubscriptionResume();
  if (!payload) return null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return payload;
}

export const HOST_SUBSCRIPTION_RESUME_QUERY = "hostSubscriptionResume";
export const HOST_SUBSCRIPTION_RESUME_CHANNEL_ID = "resumeChannelId";
export const HOST_SUBSCRIPTION_RESUME_EVENT_ID = "resumeEventId";
export const HOST_SUBSCRIPTION_RESUME_TITLE = "resumeTitle";

export function parseResumeKindFromSearch(
  value: string | null
): HostSubscriptionResumeKind | null {
  if (!value || !isValidKind(value)) return null;
  return value;
}
