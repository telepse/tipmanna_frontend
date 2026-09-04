export type ExploreCoOwnerLabelInput = {
  coOwnerName?: string | null;
  coOwnerHostUsername?: string | null;
  coOwnerHostIsUnclaimed?: boolean | null;
};

/** Reel overlay label: invite name while unclaimed, @username once claimed. */
export function resolveExploreCoOwnerReelLabel(
  item: ExploreCoOwnerLabelInput
): string | null {
  const username =
    typeof item.coOwnerHostUsername === "string"
      ? item.coOwnerHostUsername.trim()
      : "";
  const name =
    typeof item.coOwnerName === "string" ? item.coOwnerName.trim() : "";
  const unclaimed = item.coOwnerHostIsUnclaimed === true;

  if (username && !unclaimed) return `@${username}`;
  if (name) return name;
  return null;
}

/** Drawer navigation username (claimed or unclaimed provisional host). */
export function resolveExploreCoOwnerDrawerUsername(
  item: ExploreCoOwnerLabelInput & { coOwnerUsername?: string | null }
): string | null {
  const hostUsername =
    typeof item.coOwnerHostUsername === "string"
      ? item.coOwnerHostUsername.trim()
      : "";
  if (hostUsername) return hostUsername;
  const legacy =
    typeof item.coOwnerUsername === "string" ? item.coOwnerUsername.trim() : "";
  return legacy || null;
}
