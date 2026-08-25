"use client";

import useSWR from "swr";
import { hasActiveHostSession } from "@/lib/host-session-client";
import { getHostSubscriptionMeAction } from "@/actions/host";
import {
  capabilitiesForStatus,
  type HostPlanCapabilities,
  type HostSubscriptionMe,
  type HostSubscriptionStatus,
} from "@/lib/host-plan-capabilities";

export function useHostPlanCapabilities() {
  const hostSessionActive = hasActiveHostSession();

  const { data, error, isLoading, mutate } = useSWR(
    hostSessionActive ? "/subscriptions/host/me-capabilities" : null,
    async () => {
      const res = await getHostSubscriptionMeAction();
      if (!res.success || !res.data) return null;
      return res.data as HostSubscriptionMe;
    },
    { revalidateOnFocus: true }
  );

  const status: HostSubscriptionStatus = data?.status ?? "none";
  const capabilities: HostPlanCapabilities =
    data?.capabilities ?? capabilitiesForStatus(status);

  return {
    info: data,
    status,
    capabilities,
    hostSubscriptionTier: data?.tier,
    hasActivePremium: data?.hasActivePremium ?? false,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
