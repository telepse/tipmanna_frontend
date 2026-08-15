"use server";

import { actionFail, actionOk, runServerFetch } from "@/lib/action-fetch";
import { serverAuthHeaders } from "@/lib/server-auth";

export type CommunityContentBankVideo = {
  id: string;
  status: string;
  visibility: string;
  createdAt: string;
  submittedBy: {
    id: string;
    fullName: string;
    username: string;
  };
  channel: {
    id: string;
    title: string;
    url: string;
    isLive: boolean;
    eventVideoType: string | null;
    sharePath: string;
    shareUrl: string;
  };
  metrics: {
    encounters: number;
    completes: number;
    saves: number;
    shares: number;
    comments: number;
    numOfTips: number;
    durationSeconds: number;
    amountRaised: number;
  };
};

export type ApprovedCommunityContentBankResponse = {
  approved: CommunityContentBankVideo[];
};

export async function getCommunityTipFeedAction(communityId: string) {
  if (!communityId?.trim()) {
    return actionFail("Community ID is required", "getCommunityTipFeedAction");
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${encodeURIComponent(communityId.trim())}/tip-feed`,
    {
      method: "GET",
      headers: await serverAuthHeaders(null),
      cache: "no-store",
    },
    "getCommunityTipFeedAction"
  );
}

export async function resumeCommunityTvAction(
  communityId: string,
  token?: string | null
) {
  if (!communityId?.trim()) {
    return actionFail("Community ID is required", "resumeCommunityTvAction");
  }
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${encodeURIComponent(communityId.trim())}/tv/resume`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "resumeCommunityTvAction"
  );
}

export async function getMyCommunitiesAction(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/me`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getMyCommunitiesAction"
  );
}

export async function getCommunityContentBankAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/content-bank`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getCommunityContentBankAction"
  );
}

export async function getApprovedCommunityContentBankAction(
  communityId: string
) {
  return runServerFetch<ApprovedCommunityContentBankResponse>(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/content-bank/approved`,
    {
      method: "GET",
      cache: "no-store",
    },
    "getApprovedCommunityContentBankAction"
  );
}

export async function getCommunitySendsAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/sends`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getCommunitySendsAction"
  );
}

export async function addCommunityVideoAction(
  token: string | null | undefined,
  communityId: string,
  body: Record<string, unknown>
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/content-bank/videos`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "addCommunityVideoAction"
  );
}

export async function inviteCoCreatorAction(
  token: string | null | undefined,
  communityId: string,
  hostEmail: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/co-creators/invite`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ hostEmail }),
      cache: "no-store",
    },
    "inviteCoCreatorAction"
  );
}

export async function listCoCreatorsAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/co-creators`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listCoCreatorsAction"
  );
}

export async function revokeCoCreatorAction(
  token: string | null | undefined,
  communityId: string,
  hostId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/co-creators/${hostId}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "revokeCoCreatorAction"
  );
}

export async function revokeCoCreatorInviteAction(
  token: string | null | undefined,
  communityId: string,
  inviteId: string
) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/${communityId}/co-creators/invites/${inviteId}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "revokeCoCreatorInviteAction"
  );
}

export async function validateCoCreatorInviteAction(inviteToken: string) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/co-creators/invite/validate?token=${encodeURIComponent(inviteToken)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "validateCoCreatorInviteAction"
  );
}

function messageFromUnknownBody(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object" && raw !== null && "error" in raw) {
    const err = (raw as { error?: { message?: string } }).error?.message;
    if (typeof err === "string" && err) return err;
  }
  if (raw && typeof raw === "object" && raw !== null && "message" in raw) {
    const m = (raw as { message?: string }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

export async function acceptCoCreatorInviteAction(inviteToken: string) {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  try {
    const headers = await serverAuthHeaders();

    const res = await fetch(
      `${base}/co-creators/accept/${encodeURIComponent(inviteToken)}`,
      { method: "POST", headers, cache: "no-store" }
    );
    const text = await res.text();
    let raw: unknown = null;
    if (text) {
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        return actionFail(
          "Server returned invalid JSON",
          "acceptCoCreatorInviteAction"
        );
      }
    }

    if (
      res.status === 401 &&
      raw &&
      typeof raw === "object" &&
      raw !== null &&
      "requiresAuth" in raw &&
      (raw as { requiresAuth?: boolean }).requiresAuth === true
    ) {
      return actionOk(
        raw as {
          requiresAuth: true;
          inviteEmail: string;
          communityName: string;
          communityId: string;
        }
      );
    }

    if (!res.ok) {
      return actionFail(
        messageFromUnknownBody(raw, `Request failed (${res.status})`),
        "acceptCoCreatorInviteAction"
      );
    }

    return actionOk(raw);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Network error — check your connection";
    return actionFail(msg, "acceptCoCreatorInviteAction");
  }
}

export async function listMyCommunitySendsAction(token?: string | null) {
  return runServerFetch(
    `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/sends/me`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listMyCommunitySendsAction"
  );
}

const api = () => process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";

// ----- Phase 4: owner membership admin (host token) -----

export async function getJoinFormAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/join-form`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getJoinFormAction"
  );
}

export async function updateJoinFormAction(
  token: string | null | undefined,
  communityId: string,
  body: Record<string, unknown>
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/join-form`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "updateJoinFormAction"
  );
}

export async function listMembersAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/members`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listMembersAction"
  );
}

export async function listSideChickActivationsAction(
  token: string | null | undefined,
  communityId: string,
  scope: "active" | "all"
) {
  const q = scope === "active" ? "?scope=active" : "?scope=all";
  return runServerFetch(
    `${api()}/communities/${communityId}/side-chick/activations${q}`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listSideChickActivationsAction"
  );
}

export async function terminateMemberAction(
  token: string | null | undefined,
  communityId: string,
  membershipId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/members/${membershipId}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "terminateMemberAction"
  );
}

export async function extendFreeMemberMembershipAction(
  token: string | null | undefined,
  communityId: string,
  membershipId: string,
  addMonths?: number
) {
  return runServerFetch<{ ok?: boolean; expiresAt?: string }>(
    `${api()}/communities/${communityId}/members/${membershipId}/extend-free`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(addMonths != null ? { addMonths } : {}),
      cache: "no-store",
    },
    "extendFreeMemberMembershipAction"
  );
}

export async function listAccessCodesOwnerAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/access-codes`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listAccessCodesOwnerAction"
  );
}

export async function createAccessCodeAction(
  token: string | null | undefined,
  communityId: string,
  body: Record<string, unknown>
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/access-codes`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createAccessCodeAction"
  );
}

export async function updateAccessCodeAction(
  token: string | null | undefined,
  communityId: string,
  codeId: string,
  body: Record<string, unknown>
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/access-codes/${codeId}`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "updateAccessCodeAction"
  );
}

export async function deleteAccessCodeAction(
  token: string | null | undefined,
  communityId: string,
  codeId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/access-codes/${codeId}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "deleteAccessCodeAction"
  );
}

export async function listInvitesAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/invites`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listInvitesAction"
  );
}

export async function createInviteAction(
  token: string | null | undefined,
  communityId: string,
  body: Record<string, unknown>
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/invites`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "createInviteAction"
  );
}

export async function deleteInviteAction(
  token: string | null | undefined,
  communityId: string,
  inviteId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/invites/${inviteId}`,
    {
      method: "DELETE",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "deleteInviteAction"
  );
}

export async function listRequestsAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/requests`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listRequestsAction"
  );
}

export async function approveRequestAction(
  token: string | null | undefined,
  communityId: string,
  requestId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/requests/${requestId}/approve`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "approveRequestAction"
  );
}

export async function rejectRequestAction(
  token: string | null | undefined,
  communityId: string,
  requestId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/requests/${requestId}/reject`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "rejectRequestAction"
  );
}

// ----- Phase 4: tipper join (tipper token) -----

export async function getJoinFormPublicAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/join-form/public`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getJoinFormPublicAction"
  );
}

/** Optional auth — one round-trip bootstrap for join UI (form + membership + paid sub). */
export async function getCommunityAccessStateAction(communityId: string) {
  return runServerFetch(
    `${api()}/communities/${communityId}/access-state`,
    {
      method: "GET",
      headers: await serverAuthHeaders(),
      cache: "no-store",
    },
    "getCommunityAccessStateAction"
  );
}

export async function requestDomainOtpAction(
  token: string | null | undefined,
  communityId: string,
  prefix: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/domain-otp/request`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ prefix }),
      cache: "no-store",
    },
    "requestDomainOtpAction"
  );
}

export async function verifyDomainOtpAction(
  token: string | null | undefined,
  communityId: string,
  prefix: string,
  code: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/domain-otp/verify`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ prefix, code }),
      cache: "no-store",
    },
    "verifyDomainOtpAction"
  );
}

export async function validateAccessCodeTipperAction(
  token: string | null | undefined,
  communityId: string,
  code: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/access-codes/validate`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ code }),
      cache: "no-store",
    },
    "validateAccessCodeTipperAction"
  );
}

export async function submitJoinAction(
  token: string | null | undefined,
  communityId: string,
  body: Record<string, unknown>
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/join`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "submitJoinAction"
  );
}

export async function getCommunityInviteAction(inviteToken: string) {
  return runServerFetch(
    `${api()}/community-invites/${encodeURIComponent(inviteToken)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "getCommunityInviteAction"
  );
}

export async function acceptCommunityInviteAction(inviteToken: string) {
  const base = api();
  try {
    const headers = await serverAuthHeaders();

    const res = await fetch(
      `${base}/community-invites/${encodeURIComponent(inviteToken)}/accept`,
      { method: "POST", headers, cache: "no-store" }
    );
    const text = await res.text();
    let raw: unknown = null;
    if (text) {
      try {
        raw = JSON.parse(text) as unknown;
      } catch {
        return actionFail(
          "Server returned invalid JSON",
          "acceptCommunityInviteAction"
        );
      }
    }

    if (
      res.status === 401 &&
      raw &&
      typeof raw === "object" &&
      raw !== null &&
      "requiresAuth" in raw &&
      (raw as { requiresAuth?: boolean }).requiresAuth === true
    ) {
      return actionOk(
        raw as {
          requiresAuth: true;
          inviteEmail: string | null;
          communityName: string;
          communityId: string;
        }
      );
    }

    if (!res.ok) {
      return actionFail(
        messageFromUnknownBody(raw, `Request failed (${res.status})`),
        "acceptCommunityInviteAction"
      );
    }

    return actionOk(raw);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Network error — check your connection";
    return actionFail(msg, "acceptCommunityInviteAction");
  }
}

// ----- Phase 5: paid subscriptions + payouts -----

export async function subscribeCommunityAction(
  token: string | null | undefined,
  communityId: string,
  body: { method: "stripe" | "wallet"; pin?: string }
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/subscribe`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "subscribeCommunityAction"
  );
}

export async function reconcileCommunitySubscribeAction(
  token: string | null | undefined,
  communityId: string,
  paymentIntentId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/subscribe/reconcile`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ paymentIntentId }),
      cache: "no-store",
    },
    "reconcileCommunitySubscribeAction"
  );
}

export async function getMyCommunitySubscriptionAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/subscription/me`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getMyCommunitySubscriptionAction"
  );
}

export async function patchCommunitySubscriptionFeeAction(
  token: string | null | undefined,
  communityId: string,
  subscriptionFeeGbp: number | null
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/subscription-fee`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ subscriptionFeeGbp }),
      cache: "no-store",
    },
    "patchCommunitySubscriptionFeeAction"
  );
}

export async function listCommunitySubscribersAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/subscribers`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "listCommunitySubscribersAction"
  );
}

export async function getCommunityOwedAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/owed`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getCommunityOwedAction"
  );
}

export async function approveCommunityBankEntryAction(
  token: string | null | undefined,
  communityId: string,
  entryId: string
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/content-bank/${entryId}/approve`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "approveCommunityBankEntryAction"
  );
}

export async function rejectCommunityBankEntryAction(
  token: string | null | undefined,
  communityId: string,
  entryId: string,
  body?: { reason?: string }
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/content-bank/${entryId}/reject`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(
        body?.reason?.trim() ? { reason: body.reason.trim() } : {}
      ),
      cache: "no-store",
    },
    "rejectCommunityBankEntryAction"
  );
}

export async function patchCommunityBankEntryVisibilityAction(
  token: string | null | undefined,
  communityId: string,
  entryId: string,
  visibility: "public" | "private"
) {
  return runServerFetch(
    `${api()}/communities/${communityId}/content-bank/${entryId}/visibility`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ visibility }),
      cache: "no-store",
    },
    "patchCommunityBankEntryVisibilityAction"
  );
}

// ----- Phase 7: discovery + Community feed -----
export async function searchCommunitiesPreviewAction(q: string) {
  return runServerFetch<{ communities: unknown[] }>(
    `${api()}/communities/search?q=${encodeURIComponent(q)}`,
    { method: "GET", headers: await serverAuthHeaders(), cache: "no-store" },
    "searchCommunitiesPreviewAction",
    raw => ({
      communities: Array.isArray((raw as { communities?: unknown }).communities)
        ? (raw as { communities: unknown[] }).communities
        : [],
    })
  );
}

export type CommunityExploreCatalogRow = {
  id: string;
  name: string;
  description: string | null;
  logoUrl?: string | null;
  createdAt: string;
  isSystem?: boolean;
  numVideos?: number;
  totalTips: number;
  memberCount: number;
  viewer?: {
    joined: boolean;
    feedActive?: boolean;
    membershipId?: string;
  };
};

export async function getCommunityExploreCatalogAction() {
  return runServerFetch<{
    total: number;
    alphabetical: CommunityExploreCatalogRow[];
    topByTips: CommunityExploreCatalogRow[];
  }>(
    `${api()}/communities/explore-catalog`,
    { method: "GET", headers: await serverAuthHeaders(), cache: "no-store" },
    "getCommunityExploreCatalogAction",
    raw => {
      const o = raw as Record<string, unknown>;
      const alphabetical = Array.isArray(o.alphabetical)
        ? (o.alphabetical as CommunityExploreCatalogRow[])
        : [];
      const topByTips = Array.isArray(o.topByTips)
        ? (o.topByTips as CommunityExploreCatalogRow[])
        : [];
      const total =
        typeof o.total === "number"
          ? o.total
          : Array.isArray(o.alphabetical)
            ? o.alphabetical.length
            : 0;
      return { total, alphabetical, topByTips };
    }
  );
}

export async function submitCommunityStartInterestAction(
  token: string | null | undefined,
  body: {
    communityName: string;
    description: string;
    communityType: string;
    logoUrl?: string | null;
    interestedStartDate?: string | null;
    contactEmail: string;
    contactPhone?: string | null;
  }
) {
  return runServerFetch<{ ok?: boolean; id?: string }>(
    `${api()}/communities/start-interest`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "submitCommunityStartInterestAction"
  );
}

export async function getMeJoinedCommunitiesAction(token?: string | null) {
  return runServerFetch<{ memberships: unknown[] }>(
    `${api()}/me/communities`,
    {
      method: "GET",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "getMeJoinedCommunitiesAction",
    raw => ({
      memberships: Array.isArray((raw as { memberships?: unknown }).memberships)
        ? (raw as { memberships: unknown[] }).memberships
        : [],
    })
  );
}

export async function patchMembershipFeedActiveAction(
  token: string | null | undefined,
  communityId: string,
  feedActive: boolean
) {
  return runServerFetch<{ ok?: boolean }>(
    `${api()}/communities/${communityId}/membership/feed-active`,
    {
      method: "PATCH",
      headers: await serverAuthHeaders(token),
      body: JSON.stringify({ feedActive }),
      cache: "no-store",
    },
    "patchMembershipFeedActiveAction"
  );
}

export async function leaveJoinedCommunityAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch<{ ok?: boolean }>(
    `${api()}/communities/${communityId}/membership/leave`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "leaveJoinedCommunityAction"
  );
}

export async function rejoinCommunityMembershipAction(
  token: string | null | undefined,
  communityId: string
) {
  return runServerFetch<{ ok?: boolean }>(
    `${api()}/communities/${communityId}/membership/rejoin`,
    {
      method: "POST",
      headers: await serverAuthHeaders(token),
      cache: "no-store",
    },
    "rejoinCommunityMembershipAction"
  );
}

export type CommunityFeaturedVideo = {
  id: string;
  channelId: string;
  eventId?: string;
  title: string;
  url: string;
  eventVideoType?: string | null;
  durationSeconds?: number;
  numOfTips?: number;
  numOfSaves?: number;
  numOfShares?: number;
  numOfComments?: number;
  numOfSeen?: number;
};

export type CommunityCustomizationResponse = {
  community: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    communityType: string | null;
    isSystem: boolean;
  };
  customization: {
    headerColor: string | null;
    tvLogoUrl: string | null;
    brandColor: string | null;
  } | null;
  featuredVideos: CommunityFeaturedVideo[];
};

export async function getCommunityCustomizationAction(communityId: string) {
  return runServerFetch<CommunityCustomizationResponse>(
    `${api()}/communities/${encodeURIComponent(communityId)}/customization`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
    "getCommunityCustomizationAction"
  );
}

export async function patchCommunityDetailsAction(
  token: string | null | undefined,
  communityId: string,
  body: {
    description?: string | null;
    communityType?: string | null;
    logoUrl?: string | null;
  }
) {
  return runServerFetch<{
    ok: boolean;
    community: CommunityCustomizationResponse["community"];
  }>(
    `${api()}/communities/${encodeURIComponent(communityId)}/details`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await serverAuthHeaders(token)),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "patchCommunityDetailsAction"
  );
}

export async function patchCommunityFeaturedVideosAction(
  token: string | null | undefined,
  communityId: string,
  featuredContentBankEntryIds: string[]
) {
  return runServerFetch<{
    ok: boolean;
    featuredVideos: CommunityFeaturedVideo[];
  }>(
    `${api()}/communities/${encodeURIComponent(communityId)}/featured-videos`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await serverAuthHeaders(token)),
      },
      body: JSON.stringify({ featuredContentBankEntryIds }),
      cache: "no-store",
    },
    "patchCommunityFeaturedVideosAction"
  );
}

export async function patchCommunityBrandingAction(
  token: string | null | undefined,
  communityId: string,
  body: {
    headerColor?: string | null;
    brandColor?: string | null;
    tvLogoUrl?: string | null;
  }
) {
  return runServerFetch<{ ok: boolean }>(
    `${api()}/communities/${encodeURIComponent(communityId)}/customization`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await serverAuthHeaders(token)),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
    "patchCommunityBrandingAction"
  );
}
