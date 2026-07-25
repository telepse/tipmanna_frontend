import { expect, type Page } from "@playwright/test";

import { requireExploreNavigationReady } from "./wait-explore-feed-ready";

/** Open the Discover quick panel from the Explore header search field. */
export async function openExploreHeaderDiscoverSearch(
  page: Page,
  term = "music"
) {
  await requireExploreNavigationReady(page, 60_000);

  const search = page.locator(
    'input[placeholder="Search videos..."]:visible'
  );
  await expect(search).toBeVisible({ timeout: 30_000 });
  await search.fill(term);
  await search.press("Enter");
}
