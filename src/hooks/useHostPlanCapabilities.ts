"use client";

import useSWR from "swr";
import { useSelector } from "react-redux";

import type { RootState } from "@/redux/store";
import {
  capabilitiesForStatus,
  type HostPlanCapabilities,
  type HostSubscriptionMe,
  type HostSubscriptionStatus,
} from "@/lib/host-plan-capabilities";

export function useHostPlanCapabilities() {
  const authToken = useSelector((s: RootState) => s.auth.token);
  const isHost = useSelector(
    (s: RootState) => s.auth.user && "role" in s.auth.user && s.auth.user.role === "HOST"
  );

  const { data, error, isLoading, mutate } = useSWR(
    isHost && authToken ? "/subscriptions/host/me-capabilities" : null,
    async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/subscriptions/host/me`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: "no-store",
        }
      );
      if (!res.ok) return null;
      return (await res.json()) as HostSubscriptionMe;
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
    hasActivePremium: data?.hasActivePremium ?? false,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
