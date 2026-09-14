export type TipLinkChannelBankMeta = {
  status?: string | null;
  visibility?: string | null;
} | null;

/** Host TipLink picker: block member-only community bank videos. */
export function isTipLinkEligibleChannel(channel: {
  communityBankEntry?: TipLinkChannelBankMeta;
}): boolean {
  const bank = channel.communityBankEntry;
  if (!bank) return true;
  return !(bank.status === "approved" && bank.visibility === "private");
}
