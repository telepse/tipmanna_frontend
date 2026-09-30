"use client";

import useSWR from "swr";
import { toast } from "react-toastify";

import {
  getTipLinkCreateEligibilityAction,
  listEventTipLinksAction,
  type TipLinkSummary,
} from "@/actions/tiplink";
import { listHostPlaylistsAction } from "@/actions/host-playlist";
import {
  isSubscriptionLapsedError,
  isSubscriptionRequiredError,
  subscriptionActionErrorMessage,
} from "@/lib/host-subscription-errors";

export type EventTipLinkTabEligibility = {
  canCreate: boolean;
  firstFreeAvailable: boolean;
  subscriptionStatus: string;
};

export type EventTipLinkTabCache = {
  tipLinks: TipLinkSummary[];
  eligibility: EventTipLinkTabEligibility | null;
  playlists: Array<{ id: string; name: string }>;
  playlistPlan: "ok" | "required" | "lapsed" | "error";
};

export function eventTipLinkTabSwrKey(eventId: string) {
  return `event-tiplink-tab:${eventId}` as const;
}

export async function fetchEventTipLinkTabCache(
  eventId: string
): Promise<EventTipLinkTabCache> {
  const [listRes, eligRes, plRes] = await Promise.all([
    listEventTipLinksAction(eventId),
    getTipLinkCreateEligibilityAction(),
    listHostPlaylistsAction(),
  ]);

  if (!listRes.success || !listRes.data) {
    throw new Error(listRes.message ?? "Could not load TipLinks");
  }

  const eligibility =
    eligRes.success && eligRes.data
      ? {
          canCreate: eligRes.data.canCreate,
          firstFreeAvailable: eligRes.data.firstFreeAvailable,
          subscriptionStatus: eligRes.data.subscriptionStatus,
        }
      : null;

  let playlists: Array<{ id: string; name: string }> = [];
  let playlistPlan: EventTipLinkTabCache["playlistPlan"] = "ok";

  if (plRes.success && plRes.data) {
    playlistPlan = "ok";
    playlists = (plRes.data.playlists ?? []).map(p => ({
      id: p.id,
      name: p.name,
    }));
  } else if (isSubscriptionRequiredError(plRes.validationBody)) {
    playlists = [];
    playlistPlan = "required";
  } else if (isSubscriptionLapsedError(plRes.validationBody)) {
    playlists = [];
    playlistPlan = "lapsed";
  } else if (!plRes.success) {
    playlists = [];
    playlistPlan = "error";
    toast.error(
      subscriptionActionErrorMessage(
        plRes.validationBody,
        plRes.message ?? "Could not load playlists"
      )
    );
  }

  return {
    tipLinks: listRes.data.tipLinks,
    eligibility,
    playlists,
    playlistPlan,
  };
}

export function useEventTipLinkTabCache(eventId: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    eventId ? eventTipLinkTabSwrKey(eventId) : null,
    () => fetchEventTipLinkTabCache(eventId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  return {
    tipLinks: data?.tipLinks ?? [],
    eligibility: data?.eligibility ?? null,
    playlists: data?.playlists ?? [],
    playlistPlan: data?.playlistPlan ?? "ok",
    hasData: data !== undefined,
    loading: isLoading && data === undefined,
    isValidating,
    isError: !!error,
    refresh: mutate,
  };
}
