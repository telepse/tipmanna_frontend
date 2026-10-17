import type { HostCapability } from "@/hooks/use-host-capability";

export type HostDashboardRedirectDecision =
  | "wait"
  | "tipper_fallback"
  | "host_auth"
  | "ready";

/**
 * Avoid sending linked hosts to /tipper while host-link or host-session probes settle.
 */
export function resolveHostDashboardRedirect(input: {
  canReadAsHost: boolean;
  canWriteAsHost: boolean;
  capabilityStatus: HostCapability["status"];
  probeLoading: boolean;
  hostSessionLoading: boolean;
}): HostDashboardRedirectDecision {
  if (input.canReadAsHost && input.canWriteAsHost) {
    return "ready";
  }

  if (
    input.probeLoading ||
    input.hostSessionLoading ||
    input.capabilityStatus === "loading"
  ) {
    return "wait";
  }

  if (input.capabilityStatus === "stale") {
    return "host_auth";
  }

  if (input.capabilityStatus === "none") {
    return "tipper_fallback";
  }

  if (input.capabilityStatus === "active" && !input.canWriteAsHost) {
    return "host_auth";
  }

  return "wait";
}
