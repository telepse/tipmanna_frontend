import { isAnalyticsSdkEnabled } from "@/lib/analytics-sdk/flags";
import {
  isCommunityFeaturedOverlayAnalyticsV2Enabled,
  isCommunityFeaturedOverlaySdkCollectionActive,
} from "@/lib/analytics-sdk/surface-flags";
import {
  EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR,
  isExploreE2eFixturesEnvEnabled,
} from "@/lib/explore-e2e-fixtures-gate";

function resolveGitMetadata():
  | {
      known: true;
      commit: string;
      commitShort: string;
      ref: string | null;
      source: "vercel_env";
    }
  | {
      known: false;
      commit: null;
      commitShort: null;
      ref: null;
      source: "unknown";
      reason: string;
    } {
  const rawCommit = process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? "";
  const rawRef = process.env.VERCEL_GIT_COMMIT_REF?.trim() ?? "";
  if (rawCommit.length >= 7) {
    return {
      known: true,
      commit: rawCommit,
      commitShort: rawCommit.slice(0, 7),
      ref: rawRef || null,
      source: "vercel_env",
    };
  }
  return {
    known: false,
    commit: null,
    commitShort: null,
    ref: null,
    source: "unknown",
    reason:
      "VERCEL_GIT_COMMIT_SHA not set on this deployment (common for some CLI preview deploys)",
  };
}

/** Safe deployment metadata for E2E/staging verification — no secrets. */
export async function GET() {
  const git = resolveGitMetadata();
  const serverRuntimeEnvEnabled = isExploreE2eFixturesEnvEnabled();
  const compileTimePublicEnv =
    process.env.NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES ?? null;

  return Response.json({
    commit: git.commit,
    commitShort: git.commitShort,
    ref: git.ref,
    git,
    /**
     * @deprecated Use exploreE2eFixtures.serverRuntimeEnvEnabled — same value;
     * does not prove client bundle contains fixtures (use runtime chunk scan).
     */
    exploreE2eFixturesBuild: serverRuntimeEnvEnabled,
    exploreE2eFixtures: {
      serverRuntimeEnvEnabled,
      compileTimePublicEnv,
      clientBuildAnchorToScanInRuntimeJs: EXPLORE_E2E_FIXTURES_CLIENT_BUILD_ANCHOR,
      clientBundleSubstantiated: false,
      substantiationNote:
        "Set clientBundleSubstantiated only via wave3-runtime-lazy-chunk-browser.mjs chunk union scan for clientBuildAnchorToScanInRuntimeJs (or featured E2E fixture strings). Server env true does not imply browser bundle.",
    },
    analytics: {
      sdkV2: isAnalyticsSdkEnabled(),
      communityFeaturedOverlayV2: isCommunityFeaturedOverlayAnalyticsV2Enabled(),
      communityFeaturedOverlaySdkCollectionActive:
        isCommunityFeaturedOverlaySdkCollectionActive(),
      serverEnvOnlyNote:
        "Analytics flags here reflect server runtime env at request time; S7-runtime still requires chunk marker proof.",
    },
  });
}
