"use client";

import useSWR from "swr";
import { hasActiveHostSession } from "@/lib/host-session-client";
import { getHostProfileAction } from "@/actions/auth";

export type HostProfileData = {
  numOfEvents?: number;
  eventCode?: string | null;
  eventSlug?: string | null;
  hostSubscriptionTier?: "NONE" | "HOST_PREMIUM" | "HOST_COMMUNITY";
  lockedCustomerType?: "INDIVIDUAL" | "ORGANIZATION" | null;
  individualLegalFirstName?: string | null;
  individualLegalLastName?: string | null;
  organizationName?: string | null;
  profileAccountType?: "INDIVIDUAL" | "ORGANIZATION" | null;
};

/** Volatile host profile fields — fetched with host session token only. */
export function useHostProfile() {
  const hostSessionActive = hasActiveHostSession();

  const { data, error, isLoading, mutate } = useSWR(
    hostSessionActive ? "/auth/host-profile-volatile" : null,
    async () => {
      const res = await getHostProfileAction();
      if (!res.success || !res.data) return null;
      return res.data as HostProfileData;
    },
    { revalidateOnFocus: true }
  );

  return {
    profile: data,
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}
