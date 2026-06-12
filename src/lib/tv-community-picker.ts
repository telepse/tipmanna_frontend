export type TvPickerOption = { id: string; name: string };

export type TvMembershipRow = {
  communityId: string;
  active: boolean;
  membershipStatus: string;
  revokedAt: string | null;
  expiresAt: string | null;
  community?: {
    id?: string;
    name?: string;
    tvActivatedAt?: string | null;
    tvHostPaused?: boolean | null;
    isSystem?: boolean;
  };
};

export type TvCommunityBrief = {
  id: string;
  name: string;
  tvActivatedAt?: string | null;
  tvHostPaused?: boolean | null;
};

const TIPMANNA_COMMUNITY_ID =
  process.env.NEXT_PUBLIC_TIPMANNA_COMMUNITY_ID?.trim() ?? "";

/** Tipmanna Public / system global feed — use "Tipmanna TV" instead. */
export function isTipmannaSystemCommunity(
  communityId: string,
  name?: string | null,
  isSystem?: boolean
): boolean {
  if (TIPMANNA_COMMUNITY_ID && communityId === TIPMANNA_COMMUNITY_ID) {
    return true;
  }
  const n = (name ?? "").trim().toLowerCase();
  if (
    n === "tipmanna public" ||
    n === "tipmanna-public" ||
    n.includes("tipmanna public")
  ) {
    return true;
  }
  return Boolean(
    isSystem && /\btipmanna\b/.test(n) && /\bpublic\b/.test(n)
  );
}

function communityTvIsWatchable(
  tvActivatedAt?: string | null,
  tvHostPaused?: boolean | null
): boolean {
  return Boolean(tvActivatedAt) && !tvHostPaused;
}

export function isActiveTvMembership(m: TvMembershipRow): boolean {
  if (!m.active || m.revokedAt) return false;
  if (m.membershipStatus !== "active") return false;
  if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
  if (
    isTipmannaSystemCommunity(
      m.communityId,
      m.community?.name,
      m.community?.isSystem
    )
  ) {
    return false;
  }
  return communityTvIsWatchable(
    m.community?.tvActivatedAt,
    m.community?.tvHostPaused
  );
}

export function membershipToTvOption(
  m: TvMembershipRow
): TvPickerOption | null {
  if (!isActiveTvMembership(m)) return null;
  return {
    id: m.communityId,
    name: m.community?.name ?? m.communityId,
  };
}

export function hostCommunityToTvOption(
  c: TvCommunityBrief
): TvPickerOption | null {
  if (isTipmannaSystemCommunity(c.id, c.name)) return null;
  if (!communityTvIsWatchable(c.tvActivatedAt, c.tvHostPaused)) return null;
  return { id: c.id, name: c.name };
}

export function mergeTvPickerOptions(
  ...lists: Array<Array<TvPickerOption | null | undefined>>
): TvPickerOption[] {
  const byId = new Map<string, TvPickerOption>();
  for (const list of lists) {
    for (const opt of list) {
      if (!opt?.id) continue;
      if (!byId.has(opt.id)) byId.set(opt.id, opt);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/** Joined tipper/visitor/host memberships with watchable community TV. */
export function buildTvPickerOptionsFromMemberships(
  memberships: TvMembershipRow[]
): TvPickerOption[] {
  return mergeTvPickerOptions(memberships.map(membershipToTvOption));
}

/** Memberships plus host-owned / co-created communities (watchable TV only). */
export function buildTvPickerOptionsForUser(params: {
  memberships: TvMembershipRow[];
  owned?: TvCommunityBrief[];
  coCreator?: TvCommunityBrief[];
}): TvPickerOption[] {
  return mergeTvPickerOptions(
    params.memberships.map(membershipToTvOption),
    (params.owned ?? []).map(hostCommunityToTvOption),
    (params.coCreator ?? []).map(hostCommunityToTvOption)
  );
}
