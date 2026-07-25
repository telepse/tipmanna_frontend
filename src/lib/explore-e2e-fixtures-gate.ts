/** Build-time gate for deterministic Explore E2E fixtures (never query-only). */
export function isExploreE2eFixturesEnvEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES === "1";
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
