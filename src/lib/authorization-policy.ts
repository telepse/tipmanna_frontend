/**
 * Frontend mirror of backend authorization tiers.
 * Keep in sync with backend/src/configs/authorization-policy.ts
 */

export type AuthTier = "A" | "B" | "C";

export type AuthCapability =
  | "hostLink.read"
  | "communities.me.read"
  | "communities.sends.read"
  | "events.hostSummary.read"
  | "events.channel.createFromDialog"
  | "events.channel.create"
  | "events.channel.setDefault"
  | "events.screenSettings.write"
  | "events.videoDisplaySettings.write"
  | "events.performers.write"
  | "events.projects.write"
  | "events.performer.togglePin"
  | "community.contentBank.addVideo"
  | "community.contentBank.manage"
  | "community.contentBank.read"
  | "community.host.read"
  | "community.host.write"
  | "community.startInterest"
  | "events.messages.read"
  | "events.messages.write"
  | "auth.creatorProfile.write"
  | "auth.hostProfile.write";

export const CAPABILITY_TIERS: Record<AuthCapability, AuthTier> = {
  "hostLink.read": "A",
  "communities.me.read": "A",
  "communities.sends.read": "A",
  "events.hostSummary.read": "A",
  "events.channel.createFromDialog": "A",
  "events.channel.create": "B",
  "events.channel.setDefault": "C",
  "events.screenSettings.write": "C",
  "events.videoDisplaySettings.write": "C",
  "events.performers.write": "C",
  "events.projects.write": "C",
  "events.performer.togglePin": "C",
  "community.contentBank.addVideo": "B",
  "community.contentBank.manage": "B",
  "community.contentBank.read": "A",
  "community.host.read": "A",
  "community.host.write": "B",
  "community.startInterest": "B",
  "events.messages.read": "C",
  "events.messages.write": "C",
  "auth.creatorProfile.write": "B",
  "auth.hostProfile.write": "B",
};

export const AUTH_ERROR_CODES = {
  HOST_SESSION_REQUIRED: "HOST_SESSION_REQUIRED",
  COHOST_SESSION_REQUIRED: "COHOST_SESSION_REQUIRED",
} as const;

/** Tier A: linkage read — needs canReadAsHost. */
export function canPerformTierA(
  canReadAsHost: boolean,
  capability: AuthCapability
): boolean {
  if (CAPABILITY_TIERS[capability] !== "A") return false;
  return canReadAsHost;
}

/** Tier B/C write — needs canWriteAsHost (active host session). */
export function canPerformWrite(
  canWriteAsHost: boolean,
  capability: AuthCapability
): boolean {
  const tier = CAPABILITY_TIERS[capability];
  if (tier === "A") return canPerformTierA(canWriteAsHost, capability);
  return canWriteAsHost;
}

export function isHostSessionRequiredError(
  message?: string | null,
  code?: string | null
): boolean {
  return (
    code === AUTH_ERROR_CODES.HOST_SESSION_REQUIRED ||
    (message?.includes("Host login required") ?? false)
  );
}

export function isCohostSessionRequiredError(
  message?: string | null,
  code?: string | null
): boolean {
  return code === AUTH_ERROR_CODES.COHOST_SESSION_REQUIRED;
}
