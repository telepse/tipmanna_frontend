"use server";

import { revalidatePath } from "next/cache";

import { runServerFetch } from "@/lib/action-fetch";
import { serverHostAuthHeaders } from "@/lib/server-auth";
import type {
  CreatorProfileCategory,
  HostCreatorDefaultTab,
  HostCreatorProfileEdit,
} from "@/schemas/creator.schema";
import type { HostPlaylistSummary } from "@/actions/host-playlist";

export type HostCreatorVideo = {
  id: string;
  title: string;
  url: string;
  numOfTips: number;
  numOfSaves: number;
  numOfSeen: number;
  numOfComments: number;
  locked: boolean;
  createdAt?: string;
  event: {
    id: string;
    eventName: string;
    eventSlug: string | null;
  };
};

export type HostCreatorPublicContent = HostCreatorVideo;

export type HostCreatorYoutubeChannel = {
  id: string;
  name: string;
  url: string;
  locked: boolean;
  videos: HostCreatorVideo[];
};

export type HostCreatorEvent = {
  id: string;
  eventName: string;
  eventSlug: string | null;
  eventBanner: string | null;
  submissionKind: "content_only" | "event_only" | "event_and_content" | null;
  numOfTips: number;
  amountRaised: number;
  createdAt: string;
  locked: boolean;
  videos: HostCreatorVideo[];
  startTime: string;
  endTime: string;
  eventDate: string;
  organizationName: string | null;
};

export type HostCreatorCommunity = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  eventRoomBanner: string | null;
  numEventRoomTips: number;
  memberCount: number;
  numVideos: number;
  status: string;
  createdAt: string;
  locked: boolean;
  eventId: string | null;
  tvActivatedAt?: string | null;
  isOwnProfile: boolean;
};

export type HostCreatorPublicProfile = {
  host: {
    id: string;
    username: string;
    fullName: string;
    eventSlug: string | null;
    createdAt: string;
    profileImageUrl: string | null;
    pageDescription: string | null;
    profileCategory: CreatorProfileCategory | null;
    externalLink: { url: string; label: string } | null;
    creatorDefaultTab?: HostCreatorDefaultTab | null;
    creatorPayoutVerifiedAt?: string | null;
  };
  stats: {
    totalVideos: number;
    totalTipsReceived: number;
    totalTipCount: number;
    totalEncounters: number;
    totalSubscribers: number;
    totalSaves: number;
    totalShares: number;
    totalTvFeatures: number;
    totalComments: number;
  };
  contents: HostCreatorPublicContent[];
  coOwnedVideos: HostCreatorVideo[];
  coOwnerPartyVideos?: HostCreatorVideo[];
  coOwnerPartyName?: string | null;
  youtubeChannels: HostCreatorYoutubeChannel[];
  events: HostCreatorEvent[];
  communities: HostCreatorCommunity[];
  playlists: HostPlaylistSummary[];
};

export async function getHostCreatorPublicProfileAction(username: string) {
  const handle = username.trim().replace(/^@/, "");
  return runServerFetch<HostCreatorPublicProfile>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/creator/${encodeURIComponent(handle)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "getHostCreatorPublicProfileAction"
  );
}

export async function getCreatorProfileForEditAction() {
  return getCreatorProfileForEditHostAction();
}

export async function getCreatorProfileForEditHostAction() {
  return runServerFetch<HostCreatorProfileEdit>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/creator-profile`,
    {
      method: "GET",
      headers: await serverHostAuthHeaders(),
      cache: "no-store",
    },
    "getCreatorProfileForEditHostAction"
  );
}

export async function updateCreatorProfileAction(values: {
  username?: string;
  profileImageUrl?: string | null;
  pageDescription?: string | null;
  profileCategory?: CreatorProfileCategory | null;
  externalLinkUrl?: string | null;
  externalLinkLabel?: string | null;
  creatorDefaultTab?: HostCreatorDefaultTab;
  previousUsername?: string;
}) {
  return updateCreatorProfileHostAction(values);
}

export async function updateCreatorProfileHostAction(values: {
  username?: string;
  profileImageUrl?: string | null;
  pageDescription?: string | null;
  profileCategory?: CreatorProfileCategory | null;
  externalLinkUrl?: string | null;
  externalLinkLabel?: string | null;
  creatorDefaultTab?: HostCreatorDefaultTab;
  previousUsername?: string;
}) {
  const { previousUsername, ...payload } = values;
  const result = await runServerFetch<
    HostCreatorProfileEdit & {
      message: string;
    }
  >(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/creator-profile`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await serverHostAuthHeaders()),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
    "updateCreatorProfileHostAction"
  );

  if (result.success && result.data?.username) {
    revalidatePath(`/creator/${result.data.username}`);
    revalidatePath(`/@${result.data.username}`);
    if (previousUsername && previousUsername !== result.data.username) {
      revalidatePath(`/creator/${previousUsername}`);
      revalidatePath(`/@${previousUsername}`);
    }
  }

  return result;
}

export async function postCreatorProfileVisitAction(
  username: string,
  path: string
) {
  const handle = username.replace(/^@/, "").trim();
  if (!handle) {
    return { success: false as const, message: "Username required" };
  }
  return runServerFetch<{ ok: boolean }>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/hosts/creator/${encodeURIComponent(handle)}/visit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      cache: "no-store",
    },
    "postCreatorProfileVisitAction"
  );
}
