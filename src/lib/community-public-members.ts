export type CommunityPublicMember = {
  username: string;
  tipCount: number;
  tipAmountMinor: number;
  paidRenewalCount: number;
  startedAt: string;
  membershipId: string;
};

export type CommunityPublicMembersResponse = {
  members: CommunityPublicMember[];
  nextCursor: string | null;
};

const rosterCache = new Map<
  string,
  { at: number; data: CommunityPublicMembersResponse }
>();
const ROSTER_TTL_MS = 45_000;

function cacheKey(communityId: string, cursor?: string | null) {
  return `${communityId.trim()}:${cursor ?? ""}`;
}

export async function fetchCommunityPublicMembers(
  communityId: string,
  opts?: { cursor?: string | null; limit?: number; bypassCache?: boolean }
): Promise<CommunityPublicMembersResponse> {
  const id = communityId.trim();
  if (!id) return { members: [], nextCursor: null };

  const key = cacheKey(id, opts?.cursor);
  if (!opts?.bypassCache) {
    const hit = rosterCache.get(key);
    if (hit && Date.now() - hit.at < ROSTER_TTL_MS) {
      return hit.data;
    }
  }

  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "");
  if (!base) return { members: [], nextCursor: null };

  const params = new URLSearchParams();
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const url = `${base}/communities/${encodeURIComponent(id)}/members/public${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`members/public ${res.status}`);
  }
  const data = (await res.json()) as CommunityPublicMembersResponse;
  rosterCache.set(key, { at: Date.now(), data });
  return data;
}

export function invalidateCommunityPublicMembersCache(communityId: string) {
  const prefix = `${communityId.trim()}:`;
  for (const key of rosterCache.keys()) {
    if (key.startsWith(prefix)) rosterCache.delete(key);
  }
}
