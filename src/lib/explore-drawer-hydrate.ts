import type { ExploreDrawerIntent } from "@/lib/explore-drawer-intent";

/** Drawers live in the feed pane; do not auto-open on join/discover/etc. */
export function isExploreFeedTabForDrawerGlance(
  searchParams: URLSearchParams
): boolean {
  const tab = searchParams.get("tab")?.trim() ?? "";
  if (
    tab === "join" ||
    tab === "discover" ||
    tab === "my-communities" ||
    tab === "community"
  ) {
    return false;
  }
  return true;
}

export function resolveInitialExploreDrawerHydrate(input: {
  creatorFromUrl: string | null;
  communityFromUrl: string | null;
  intent: ExploreDrawerIntent | null;
  feedTabVisible: boolean;
}): ExploreDrawerIntent | null {
  if (!input.feedTabVisible) return null;
  if (input.creatorFromUrl) {
    return { kind: "creator", username: input.creatorFromUrl };
  }
  if (input.communityFromUrl) {
    return { kind: "community", communityId: input.communityFromUrl };
  }
  return input.intent;
}
