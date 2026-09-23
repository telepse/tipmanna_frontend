"use client";

import useSWR from "swr";

import {
  getCommunityContentBankAction,
  getCommunityOwedAction,
  getCommunitySendsAction,
  listCoCreatorsAction,
} from "@/actions/communities";

export type HostCommunityBankCache = {
  approved: unknown[];
  pending: unknown[];
};

export type HostCommunityCoCreatorsCache = {
  active: unknown[];
  pendingMemberships: unknown[];
  revoked: unknown[];
  pendingInvites: unknown[];
};

export type HostCommunityOwedCache = Record<string, unknown>;

function bankKey(communityId: string) {
  return `host-community-bank:${communityId}` as const;
}

function coCreatorsKey(communityId: string) {
  return `host-community-co-creators:${communityId}` as const;
}

function owedKey(communityId: string) {
  return `host-community-owed:${communityId}` as const;
}

function sendsKey(communityId: string) {
  return `host-community-sends:${communityId}` as const;
}

export function hostCommunityBankSwrKey(communityId: string) {
  return bankKey(communityId);
}

export function useHostCommunityDashboardCache(
  communityId: string | null,
  role: "owner" | "coCreator" | null,
  authToken: string | null | undefined,
  authUserId: string | null | undefined,
  communityFeatureOn: boolean
) {
  const ownerReady =
    communityFeatureOn &&
    Boolean(communityId) &&
    role === "owner" &&
    Boolean(authUserId) &&
    Boolean(authToken);

  const coReady =
    communityFeatureOn &&
    Boolean(communityId) &&
    role === "coCreator" &&
    Boolean(authUserId) &&
    Boolean(authToken);

  const bank = useSWR(
    ownerReady && communityId ? bankKey(communityId) : null,
    async () => {
      const res = await getCommunityContentBankAction(authToken!, communityId!);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Could not load content bank");
      }
      const d = res.data as { approved?: unknown[]; pending?: unknown[] };
      return {
        approved: d.approved ?? [],
        pending: d.pending ?? [],
      } satisfies HostCommunityBankCache;
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: false,
    }
  );

  const coCreators = useSWR(
    ownerReady && communityId ? coCreatorsKey(communityId) : null,
    async () => {
      const res = await listCoCreatorsAction(communityId!);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Could not load co-creators");
      }
      const d = res.data as HostCommunityCoCreatorsCache;
      return {
        active: d.active ?? [],
        pendingMemberships: d.pendingMemberships ?? [],
        revoked: d.revoked ?? [],
        pendingInvites: d.pendingInvites ?? [],
      } satisfies HostCommunityCoCreatorsCache;
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: false,
    }
  );

  const owed = useSWR(
    ownerReady && communityId ? owedKey(communityId) : null,
    async () => {
      const res = await getCommunityOwedAction(authToken!, communityId!);
      if (!res.success || !res.data) {
        return null;
      }
      return res.data as HostCommunityOwedCache;
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: false,
    }
  );

  const sends = useSWR(
    coReady && communityId ? sendsKey(communityId) : null,
    async () => {
      const res = await getCommunitySendsAction(authToken!, communityId!);
      if (!res.success || !res.data) {
        throw new Error(res.message ?? "Could not load sends");
      }
      const d = res.data as { sends?: unknown[] };
      return d.sends ?? [];
    },
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: false,
    }
  );

  const refreshBank = () =>
    communityId ? bank.mutate() : Promise.resolve(undefined);
  const refreshCoCreators = () =>
    communityId ? coCreators.mutate() : Promise.resolve(undefined);
  const refreshOwed = () =>
    communityId ? owed.mutate() : Promise.resolve(undefined);
  const refreshSends = () =>
    communityId ? sends.mutate() : Promise.resolve(undefined);

  const refreshOwnerBundle = async () => {
    await Promise.all([refreshBank(), refreshCoCreators(), refreshOwed()]);
  };

  const refreshAfterVideoChange = async () => {
    await Promise.all([refreshBank(), refreshCoCreators(), refreshSends()]);
  };

  return {
    bank: bank.data ?? null,
    bankError: bank.error,
    loadingBank: bank.isLoading && bank.data === undefined,
    validatingBank: bank.isValidating,
    coCreators: coCreators.data ?? null,
    coCreatorsError: coCreators.error,
    loadingCo: coCreators.isLoading && coCreators.data === undefined,
    owed: owed.data ?? null,
    loadingOwed: owed.isLoading && owed.data === undefined,
    sends: sends.data ?? null,
    sendsError: sends.error,
    loadingSends: sends.isLoading && sends.data === undefined,
    refreshBank,
    refreshCoCreators,
    refreshOwed,
    refreshSends,
    refreshOwnerBundle,
    refreshAfterVideoChange,
  };
}
