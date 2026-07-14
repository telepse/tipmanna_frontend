/** Client/server feature flags for Explore post-P0 optimizations. */

export function isExploreDiscoverSeoDeferralEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_EXPLORE_DISCOVER_SEO_DEFERRAL_ENABLED === "true"
  );
}

export function isExploreTvPrefetchAfterStableEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_EXPLORE_TV_PREFETCH_AFTER_STABLE_ENABLED === "true"
  );
}
