export type TipLinkAttributionInput = {
  hostFirstName: string;
  communityName?: string | null;
  coOwnerName?: string | null;
};

export function formatTipLinkAttribution({
  hostFirstName,
  communityName,
  coOwnerName,
}: TipLinkAttributionInput): string {
  const primary = communityName?.trim() || hostFirstName.trim();
  const coOwner = coOwnerName?.trim();
  if (primary && coOwner) {
    return `${coOwner} and ${primary}`;
  }
  return primary;
}
