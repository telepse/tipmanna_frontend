import {
  isCommunityTvEntitledFromAccessState,
  type CommunityTvAccessStateSlice,
} from "@/lib/community-tv-entitlement";
import {
  normalizeTvCommunitySearchParam,
  type SsrCommunityTvViewerEntitlement,
} from "@/lib/tv-ssr-live-tip-catalog";

/** Server `urlCommunityIntent` plus client window query when RSC omitted `community`. */
export function resolveCommunityIntentFromUrl(
  urlCommunityIntent: string | null | undefined
): string | null {
  const fromServer = normalizeTvCommunitySearchParam(urlCommunityIntent);
  if (fromServer) return fromServer;
  if (typeof window !== "undefined") {
    return normalizeTvCommunitySearchParam(
      new URLSearchParams(window.location.search).get("community")
    );
  }
  return null;
}

export type CommunityTvAccessGatePhase =
  | "idle"
  | "checking"
  | "allowed"
  | "denied";

/** True when SSR already resolved entitlement for this server URL community. */
export function ssrCommunityTvEntitlementAppliesToIntent(
  communityIntent: string | null,
  urlCommunityIntent: string | null | undefined,
  ssrEntitlement: SsrCommunityTvViewerEntitlement
): boolean {
  if (ssrEntitlement === "unknown") return false;
  const intent = communityIntent?.trim();
  if (!intent) return false;
  return normalizeTvCommunitySearchParam(urlCommunityIntent) === intent;
}

/** Initial client gate phase from SSR (no client access-state round trip). */
export function resolveInitialCommunityTvGatePhase(
  communityIntent: string | null,
  urlCommunityIntent: string | null | undefined,
  ssrEntitlement: SsrCommunityTvViewerEntitlement
): CommunityTvAccessGatePhase {
  if (!communityIntent?.trim()) return "idle";
  if (
    !ssrCommunityTvEntitlementAppliesToIntent(
      communityIntent,
      urlCommunityIntent,
      ssrEntitlement
    )
  ) {
    return "checking";
  }
  return ssrEntitlement === "entitled" ? "allowed" : "denied";
}

export type CommunityTvAccessGateResolution =
  | { outcome: "no_community_intent"; phase: "idle" }
  | { outcome: "allowed"; phase: "allowed"; communityId: string }
  | { outcome: "denied"; phase: "denied"; communityId: string };

/**
 * Fail-closed entitlement resolution for Community TV source activation.
 * Does not mutate storage or schedule source — caller applies side effects.
 */
export function resolveCommunityTvAccessGate(
  communityIntent: string | null,
  accessStateSuccess: boolean,
  accessStateData: CommunityTvAccessStateSlice | null | undefined
): CommunityTvAccessGateResolution {
  if (!communityIntent?.trim()) {
    return { outcome: "no_community_intent", phase: "idle" };
  }
  const communityId = communityIntent.trim();
  if (!accessStateSuccess) {
    return { outcome: "denied", phase: "denied", communityId };
  }
  if (isCommunityTvEntitledFromAccessState(accessStateData)) {
    return { outcome: "allowed", phase: "allowed", communityId };
  }
  return { outcome: "denied", phase: "denied", communityId };
}

/** Stable Community TV viewer identity — access tokens may rotate without changing the viewer. */
export function resolveCommunityTvAuthViewerKey(
  isAuthenticated: boolean,
  userId: string | null | undefined
): string | null {
  if (!isAuthenticated) return null;
  const id = typeof userId === "string" ? userId.trim() : "";
  return id.length > 0 ? id : null;
}

export function isDefinitiveSsrCommunityTvEntitlement(
  entitlement: SsrCommunityTvViewerEntitlement
): entitlement is "entitled" | "denied" {
  return entitlement === "entitled" || entitlement === "denied";
}

export type CommunityTvAuthViewerBaseline = {
  viewerKey: string | null;
};

export type CommunityTvAuthViewerSettlement =
  | { status: "pending" }
  | { status: "settled"; viewerKey: string | null };

const PERSISTED_SIGNED_IN_ROLES = new Set([
  "TIPPER",
  "HOST",
  "COHOST",
  "ADMIN",
  "SUPERADMIN",
]);

function hasPersistedSignedInUserRecord(
  userId: string | null | undefined,
  userRole: string | null | undefined
): boolean {
  const id = typeof userId === "string" ? userId.trim() : "";
  if (!id) return false;
  const role = userRole?.trim().toUpperCase() ?? "";
  return PERSISTED_SIGNED_IN_ROLES.has(role);
}

/**
 * Whether Redux auth is stable enough to establish an SSR entitlement baseline.
 * Uses redux-persist rehydration + persistStore bootstrap callback and auth slice fields.
 */
export function resolveCommunityTvAuthViewerSettlement(input: {
  persistRehydrated: boolean;
  /** From auth.persistAuthHydrationComplete — persistStore rehydration callback. */
  persistAuthHydrationComplete: boolean;
  isAuthenticated: boolean;
  requiresVerification: boolean;
  userId: string | null | undefined;
  userRole: string | null | undefined;
  token: string | null | undefined;
}): CommunityTvAuthViewerSettlement {
  if (!input.persistRehydrated || !input.persistAuthHydrationComplete) {
    return { status: "pending" };
  }

  if (input.isAuthenticated) {
    const viewerKey = resolveCommunityTvAuthViewerKey(true, input.userId);
    if (!viewerKey) {
      return { status: "pending" };
    }
    return { status: "settled", viewerKey };
  }

  if (
    input.requiresVerification ||
    hasPersistedSignedInUserRecord(input.userId, input.userRole)
  ) {
    return { status: "pending" };
  }

  const token = input.token?.trim();
  if (token) {
    return { status: "pending" };
  }

  return { status: "settled", viewerKey: null };
}

export type CommunityTvClientEntitlementProbePlan =
  | "skip_ssr_authoritative"
  | "defer_until_persist_rehydrated"
  | "establish_baseline"
  | "run_client_probe";

/**
 * Client gate effect plan when SSR may already have resolved Community TV entitlement.
 * Caller runs `getCommunityAccessStateAction` only for `run_client_probe`.
 */
export function resolveCommunityTvClientEntitlementProbePlan(input: {
  ssrApplies: boolean;
  ssrEntitlement: SsrCommunityTvViewerEntitlement;
  settlement: CommunityTvAuthViewerSettlement;
  authBaselineEstablished: boolean;
  baselineViewerKey: string | null;
}): CommunityTvClientEntitlementProbePlan {
  const definitive =
    input.ssrApplies &&
    isDefinitiveSsrCommunityTvEntitlement(input.ssrEntitlement);

  if (definitive) {
    if (input.settlement.status === "pending") {
      return "defer_until_persist_rehydrated";
    }
    const viewerKey = input.settlement.viewerKey;
    if (!input.authBaselineEstablished) {
      return "establish_baseline";
    }
    if (input.baselineViewerKey === viewerKey) {
      return "skip_ssr_authoritative";
    }
    return "run_client_probe";
  }

  return "run_client_probe";
}

/** True when viewer identity changed in a way that should re-check Community TV access. */
export function hasGenuineCommunityTvAuthViewerTransition(
  baselineViewerKey: string | null,
  viewerKey: string | null
): boolean {
  return baselineViewerKey !== viewerKey;
}
