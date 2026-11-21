/**
 * Literal retained in client JS when NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES=1 at
 * compile time (Wave 3 runtime chunk scan / deploy-info substantiation).
 */
export const EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR =
  "tipmanna-explore-e2e-fixtures-client-build-v1";

/** Build-time gate for deterministic Explore E2E fixtures (never query-only). */
export function isExploreE2eFixturesEnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES === "1";
}

/** Anchor string baked into client bundles when the build flag is on; else null. */
export function exploreE2eFixturesClientBuildAnchor(): string | null {
  return isExploreE2eFixturesEnvEnabled()
    ? EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR
    : null;
}

/**
 * Fixtures activate only when the E2E build flag and `?e2e=1` are both present.
 * Normal production builds ignore `?e2e=1` without the build-time flag.
 */
export function isExploreE2eFixturesEnabled(
  urlParams: URLSearchParams | string
): boolean {
  const params =
    typeof urlParams === "string"
      ? new URLSearchParams(
          urlParams.startsWith("?") ? urlParams.slice(1) : urlParams
        )
      : urlParams;
  return isExploreE2eFixturesEnvEnabled() && params.get("e2e") === "1";
}

/** Client-only dual-gate check for skipping non-routing background API calls in E2E. */
export function isExploreE2eFixturesActiveOnClient(): boolean {
  if (typeof window === "undefined") return false;
  return isExploreE2eFixturesEnabled(window.location.search);
}
