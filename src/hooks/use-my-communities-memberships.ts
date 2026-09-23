"use client";

import useSWR from "swr";

import { getMyCommunitiesAction } from "@/actions/communities";

export type HostCommunityMembership = {
  id: string;
  name: string;
  role: "owner" | "coCreator";
  eventType?: string;
  eventId?: string | null;
  tvActivatedAt?: string | null;
  tvHostPaused: boolean;
};

type CommunityBrief = {
  id: string;
  name: string;
  event?: { id: string; eventType: string } | null;
  tvActivatedAt?: string | null;
  tvHostPaused?: boolean | null;
};

function parseMemberships(raw: {
  owned?: CommunityBrief[];
  coCreator?: CommunityBrief[];
}): HostCommunityMembership[] {
  const byId = new Map<string, HostCommunityMembership>();
  for (const c of raw.owned ?? []) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      role: "owner",
      eventType: c.event?.eventType,
      eventId: c.event?.id ?? null,
      tvActivatedAt: c.tvActivatedAt ?? null,
      tvHostPaused: Boolean(c.tvHostPaused),
    });
  }
  for (const c of raw.coCreator ?? []) {
    if (!byId.has(c.id)) {
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        role: "coCreator",
        eventType: c.event?.eventType,
        eventId: c.event?.id ?? null,
        tvActivatedAt: c.tvActivatedAt ?? null,
        tvHostPaused: Boolean(c.tvHostPaused),
      });
    }
  }
  return Array.from(byId.values());
}

export function useMyCommunitiesMemberships(
  authUserId: string | null | undefined,
  authToken: string | null | undefined
) {
  const swrKey =
    authUserId && authToken ? `host-my-communities:${authUserId}` : null;

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    swrKey,
    async () => {
      const res = await getMyCommunitiesAction(authToken!);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Could not load communities");
      }
      return parseMemberships(
        res.data as {
          owned?: CommunityBrief[];
          coCreator?: CommunityBrief[];
        }
      );
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: true,
    }
  );

  return {
    memberships: data ?? [],
    isLoadingInitial: isLoading && data === undefined,
    isValidating,
    error: error instanceof Error ? error.message : null,
    refreshMemberships: () => mutate(),
  };
}
