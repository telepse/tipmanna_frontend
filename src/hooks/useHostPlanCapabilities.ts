"use client";

import useSWR from "swr";
import { useDispatch } from "react-redux";
import { getHostSubscriptionMeAction } from "@/actions/host";
import { useHostSession } from "@/hooks/use-host-session";
import {
  capabilitiesForStatus,
  type HostPlanCapabilities,
  type HostSubscriptionMe,
  type HostSubscriptionStatus,
} from "@/lib/host-plan-capabilities";
import { authErrorCodeFromActionResult, isAuthSessionRequired } from "@/lib/host-auth-fetch";
import { updateTipper } from "@/features/auth-slice";

export type HostSubscriptionFetchError = {
  message: string;
  validationBody?: unknown;
  requiresHostSession: boolean;
};

export function useHostPlanCapabilities() {
  const dispatch = useDispatch();
  const { isActive: hostSessionActive, isLoading: hostSessionLoading } =
    useHostSession();

  const { data, error, isLoading, mutate } = useSWR(
    hostSessionActive && !hostSessionLoading
      ? "/subscriptions/host/me-capabilities"
      : null,
    async () => {
      const res = await getHostSubscriptionMeAction();
      if (!res.success || !res.data) {
        const { code, message } = authErrorCodeFromActionResult(res);
        const authKind = isAuthSessionRequired(code, message ?? null);
        const err = new Error(
          message ?? res.message ?? "Failed to load subscription"
        ) as Error & {
          validationBody?: unknown;
          requiresHostSession?: boolean;
        };
        err.validationBody = res.validationBody;
        err.requiresHostSession = authKind === "host";
        throw err;
      }
      const payload = res.data as HostSubscriptionMe;
      const t = payload.tier;
      const hostSubscriptionTier =
        t === "NONE" || t === "HOST_PREMIUM" || t === "HOST_COMMUNITY"
          ? t
          : undefined;
      dispatch(updateTipper({ hostSubscriptionTier }));
      return payload;
    },
    { revalidateOnFocus: true, dedupingInterval: 15_000 }
  );

  const status: HostSubscriptionStatus = data?.status ?? "none";
  const capabilities: HostPlanCapabilities =
    data?.capabilities ?? capabilitiesForStatus(status);

  const fetchError: HostSubscriptionFetchError | null = error
    ? {
        message:
          error instanceof Error ? error.message : "Failed to load subscription",
        validationBody:
          error instanceof Error && "validationBody" in error
            ? (error as { validationBody?: unknown }).validationBody
            : undefined,
        requiresHostSession:
          error instanceof Error &&
          "requiresHostSession" in error &&
          Boolean((error as { requiresHostSession?: boolean }).requiresHostSession),
      }
    : null;

  return {
    info: data,
    status,
    capabilities,
    hostSubscriptionTier: data?.tier,
    hasActivePremium: data?.hasActivePremium ?? false,
    isLoading,
    isError: !!error,
    fetchError,
    refresh: mutate,
  };
}
