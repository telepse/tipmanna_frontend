import type { Page } from "@playwright/test";

import {
  E2E_DISCOVER_CONTENTS,
  E2E_FEED_BOOT,
  E2E_JOINED_MEMBERSHIP,
} from "@/lib/e2e-explore-fixtures";

/**
 * Append `e2e=1` for Playwright navigations.
 * Fixtures activate only when the frontend was built with
 * `NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES=1` and the URL carries `?e2e=1`.
 */
export function withE2eFixtures(path: string): string {
  const u = new URL(path, "http://localhost");
  u.searchParams.set("e2e", "1");
  return `${u.pathname}${u.search}`;
}

/** Seed SSR boot client-side before navigation (Scenario A — populated Feed). */
export async function installPopulatedFeedSeed(page: Page): Promise<void> {
  await page.addInitScript(payload => {
    window.__EXPLORE_SSR_BOOT__ = payload;
  }, E2E_FEED_BOOT);
}

/** Documented deterministic strategy: build flag + `?e2e=1` activates fixtures in page client. */
export const EXPLORE_E2E_DATA_STRATEGY = {
  populatedFeed:
    "Build with NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES=1 and navigate with ?e2e=1",
  emptyFeed:
    "Navigate without the dual gate; valid empty/fail-open terminal state",
  discoverCatalog: "Dual gate seeds discover contents for panel/Expand/tags",
  communityJoin:
    "Dual gate seeds joined membership row; Join uses E2E_JOIN_COMMUNITY_ID deep link",
  requestsMocked:
    "none — uses NEXT_PUBLIC_ENABLE_EXPLORE_E2E_FIXTURES + ?e2e=1 seam",
} as const;

export {
  E2E_FEED_BOOT,
  E2E_DISCOVER_CONTENTS,
  E2E_JOINED_MEMBERSHIP,
  E2E_JOIN_COMMUNITY_ID,
  E2E_SELECT_COMMUNITY_ID,
} from "@/lib/e2e-explore-fixtures";
