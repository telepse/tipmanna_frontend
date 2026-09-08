"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";

const base = () =>
  (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "").replace(/\/$/, "");

export type TipLinkStatus = "draft" | "published";
export type TipLinkBannerSource = "thumbnail" | "upload";

export type TipLinkSocial = {
  platform: string;
  url: string;
  label?: string;
};

export type TipLinkVisitAnalytics = {
  visits7d: number;
  visits24h: number;
  topCountries: Array<{ code: string; count: number }>;
};

export type TipLinkSummary = {
  id: string;
  slug: string;
  status: TipLinkStatus;
  eventChannelId: string;
  eventId: string;
  title: string;
  description: string | null;
  videoUrl: string;
  pitch: string | null;
  bannerUrl: string | null;
  bannerSource: TipLinkBannerSource | null;
  appleMusicUrl: string | null;
  spotifyUrl: string | null;
  audiomackUrl: string | null;
  tiktokUrl: string | null;
  customLinkLabel: string | null;
  customLinkUrl: string | null;
  featuredPlaylistId: string | null;
  socials: TipLinkSocial[];
  pageVisitCount: number;
  pageVisits90d: number;
  videoTipCount: number;
  visitAnalytics?: TipLinkVisitAnalytics;
  landingUrl: string;
  createdAt: string;
  updatedAt: string;
  host: {
    id: string;
    username: string;
    fullName: string;
  };
  featuredPlaylist: {
    id: string;
    name: string;
    bannerUrl: string | null;
  } | null;
};

export type TipLinkPublicPayload = {
  tipLink: TipLinkSummary;
  eventId: string;
  channel: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    numOfTips: number;
    contentCountry: string;
    contentLanguage: string;
  };
  event: {
    id: string;
    eventName: string;
    eventSlug: string | null;
    communityId: string | null;
    showAmountRaisedOnVideos: boolean | null;
    showViewCountOnVideos: boolean | null;
    showEncounterOnVideos: boolean | null;
    amountRaised: number;
    numOfTips: number;
    contentCountry: string;
    contentLanguage: string;
  };
  host: {
    id: string;
    username: string;
    fullName: string;
    profileImageUrl: string | null;
    externalLink: { url: string; label: string } | null;
  };
  metrics: {
    saves: number;
    shares: number;
    encounters: number;
    comments: number;
    pageVisits90d: number;
    pageVisitCount: number;
  };
  featuredPlaylist: {
    id: string;
    name: string;
    description: string | null;
    bannerUrl: string | null;
  } | null;
  preview?: boolean;
};

export type TipLinkCreateEligibility = {
  canCreate: boolean;
  firstFreeAvailable: boolean;
  tipLinksCreatedCount: number;
  subscriptionStatus: string;
};

export async function listHostTipLinksAction() {
  return runServerFetch<{ tipLinks: TipLinkSummary[] }>(
    `${base()}/host/tiplinks`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listHostTipLinksAction",
    raw => {
      const o = raw as { tipLinks?: TipLinkSummary[] };
      return { tipLinks: Array.isArray(o.tipLinks) ? o.tipLinks : [] };
    }
  );
}

export async function listEventTipLinksAction(eventId: string) {
  return runServerFetch<{ tipLinks: TipLinkSummary[] }>(
    `${base()}/host/tiplinks/event/${encodeURIComponent(eventId)}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "listEventTipLinksAction",
    raw => {
      const o = raw as { tipLinks?: TipLinkSummary[] };
      return { tipLinks: Array.isArray(o.tipLinks) ? o.tipLinks : [] };
    }
  );
}

export async function getTipLinkCreateEligibilityAction() {
  return runServerFetch<TipLinkCreateEligibility>(
    `${base()}/host/tiplinks/create-eligibility`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getTipLinkCreateEligibilityAction"
  );
}

export async function suggestTipLinkSlugAction(title: string) {
  const q = new URLSearchParams({ title });
  return runServerFetch<{ slug: string }>(
    `${base()}/host/tiplinks/suggest-slug?${q}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "suggestTipLinkSlugAction"
  );
}

export async function createTipLinkDraftAction(input: {
  eventChannelId: string;
  slug: string;
}) {
  const res = await runServerFetch<{ tipLink: TipLinkSummary }>(
    `${base()}/host/tiplinks`,
    {
      method: "POST",
      headers: {
        ...(await serverHostAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    "createTipLinkDraftAction"
  );
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}

export type UpdateTipLinkInput = {
  slug?: string;
  status?: TipLinkStatus;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
  pitch?: string | null;
  bannerUrl?: string | null;
  bannerSource?: TipLinkBannerSource | null;
  appleMusicUrl?: string | null;
  spotifyUrl?: string | null;
  audiomackUrl?: string | null;
  tiktokUrl?: string | null;
  customLinkLabel?: string | null;
  customLinkUrl?: string | null;
  featuredPlaylistId?: string | null;
  socials?: TipLinkSocial[];
};

export async function updateTipLinkAction(
  id: string,
  input: UpdateTipLinkInput
) {
  const res = await runServerFetch<{ tipLink: TipLinkSummary }>(
    `${base()}/host/tiplinks/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        ...(await serverHostAuthHeaders()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    "updateTipLinkAction"
  );
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}

export async function deleteTipLinkAction(id: string) {
  const res = await runServerFetch<{ message: string }>(
    `${base()}/host/tiplinks/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: await serverHostAuthHeaders(),
    },
    "deleteTipLinkAction"
  );
  if (res.success) {
    revalidatePath("/");
  }
  return res;
}

export async function getPublicTipLinkAction(slug: string) {
  return runServerFetch<TipLinkPublicPayload>(
    `${base()}/tiplinks/${encodeURIComponent(slug)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "getPublicTipLinkAction"
  );
}

export async function getTipLinkPreviewAction(id: string) {
  return runServerFetch<TipLinkPublicPayload>(
    `${base()}/host/tiplinks/preview/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getTipLinkPreviewAction"
  );
}

export async function postTipLinkVisitAction(slug: string, path: string) {
  const incoming = await headers();
  const visitHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const cfCountry = incoming.get("cf-ipcountry");
  const vercelCountry = incoming.get("x-vercel-ip-country");
  if (cfCountry) visitHeaders["cf-ipcountry"] = cfCountry;
  if (vercelCountry) visitHeaders["x-vercel-ip-country"] = vercelCountry;

  return runServerFetch<{ ok: boolean }>(
    `${base()}/tiplinks/${encodeURIComponent(slug)}/visit`,
    {
      method: "POST",
      headers: visitHeaders,
      body: JSON.stringify({ path }),
    },
    "postTipLinkVisitAction"
  );
}

export async function getHostTipLinkAction(id: string) {
  return runServerFetch<TipLinkPublicPayload>(
    `${base()}/host/tiplinks/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getHostTipLinkAction"
  );
}
