export type TipLinkChannelBankMeta = {
  status?: string | null;
  visibility?: string | null;
} | null;

/** Any community-bank video (public or private) — use community-bank picker path. */
export function isCommunityBankChannel(channel: {
  communityBankEntry?: TipLinkChannelBankMeta;
}): boolean {
  const bank = channel.communityBankEntry;
  return Boolean(bank && bank.status === "approved");
}

/** Event-room TipLink path: exclude all community-bank videos. */
export function isTipLinkEligibleEventRoomChannel(channel: {
  communityBankEntry?: TipLinkChannelBankMeta;
}): boolean {
  return !isCommunityBankChannel(channel);
}

/** Host TipLink picker: block member-only community bank videos. */
export function isTipLinkEligibleChannel(channel: {
  communityBankEntry?: TipLinkChannelBankMeta;
}): boolean {
  const bank = channel.communityBankEntry;
  if (!bank) return true;
  return !(bank.status === "approved" && bank.visibility === "private");
}

/** Community public-bank TipLink path (approved + public visibility). */
export function isTipLinkEligibleCommunityBankChannel(channel: {
  communityBankEntry?: TipLinkChannelBankMeta;
}): boolean {
  const bank = channel.communityBankEntry;
  return Boolean(
    bank && bank.status === "approved" && bank.visibility === "public"
  );
}
