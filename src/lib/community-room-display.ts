export const COMMUNITY_DISPLAY_UPDATED_EVENT = "display-updated" as const;

export function communityDisplayChannel(communityId: string): string {
  return `community-${communityId.trim()}`;
}

export type CommunityRoomScreenSettings = {
  background: string;
  backgroundType?: string;
  moneyFor: string;
  showLatest: boolean;
  hideProgressAmount: boolean;
};

export function mapCommunityRoomScreenSettings(
  raw: Record<string, unknown> | null | undefined
): CommunityRoomScreenSettings {
  const data =
    raw && typeof raw === "object" && "data" in raw && raw.data
      ? (raw.data as Record<string, unknown>)
      : raw;
  return {
    background: typeof data?.background === "string" ? data.background : "",
    backgroundType:
      typeof data?.backgroundType === "string"
        ? data.backgroundType
        : undefined,
    moneyFor: typeof data?.moneyFor === "string" ? data.moneyFor : "",
    showLatest: data?.showLatest === true,
    hideProgressAmount: data?.hideProgressAmount === true,
  };
}

export function parseDisplayUpdatedPayload(data: unknown): {
  communityId: string;
  at: number;
} | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const communityId =
    typeof o.communityId === "string" ? o.communityId.trim() : "";
  const at = typeof o.at === "number" ? o.at : NaN;
  if (!communityId || !Number.isFinite(at)) return null;
  return { communityId, at };
}
