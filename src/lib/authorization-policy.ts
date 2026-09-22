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
  | "events.project.togglePin"
  | "events.pinRoster.read"
  | "community.contentBank.addVideo"
  | "community.contentBank.manage"
  | "community.contentBank.read"
  | "community.host.read"
  | "community.host.write"
  | "community.startInterest"
  | "events.messages.read"
  | "events.messages.write"
  | "auth.creatorProfile.write"
  | "auth.hostProfile.write"
  | "payouts.me.read"
  | "payouts.me.write"
  | "subscriptions.host.me";

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
  "events.project.togglePin": "C",
  "events.pinRoster.read": "C",
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
  "payouts.me.read": "B",
  "payouts.me.write": "B",
  "subscriptions.host.me": "B",
};

export const AUTH_ERROR_CODES = {
  HOST_SESSION_REQUIRED: "HOST_SESSION_REQUIRED",
  COHOST_SESSION_REQUIRED: "COHOST_SESSION_REQUIRED",
  EMAIL_VERIFICATION_REQUIRED: "EMAIL_VERIFICATION_REQUIRED",
} as const;

/** Tier A: linkage read — needs canReadAsHost. */
export function canPerformTierA(
  canReadAsHost: boolean,
  capability: AuthCapability
): boolean {
  if (CAPABILITY_TIERS[capability] !== "A") return false;
  return canReadAsHost;
}

/** Tier B/C write — Tier A uses canReadAsHost; B/C use canWriteAsHost. */
export function canPerformWrite(
  canReadAsHost: boolean,
  canWriteAsHost: boolean,
  capability: AuthCapability
): boolean {
  const tier = CAPABILITY_TIERS[capability];
  if (tier === "A") return canPerformTierA(canReadAsHost, capability);
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

export function isEmailVerificationRequiredError(
  code?: string | null
): boolean {
  return code === AUTH_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED;
}
