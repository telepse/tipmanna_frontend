import { isExploreE2eFixturesEnvEnabled } from "@/lib/explore-e2e-fixtures-gate";

/** Safe deployment metadata for E2E/staging verification — no secrets. */
export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null;
  return Response.json({
    commit,
    commitShort: commit ? commit.slice(0, 7) : null,
    ref: process.env.VERCEL_GIT_COMMIT_REF?.trim() ?? null,
    exploreE2eFixturesBuild: isExploreE2eFixturesEnvEnabled(),
  });
}
