import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import { discoverTagRow } from "./helpers/explore-filter-helpers";
import { openExploreHeaderDiscoverSearch } from "./helpers/open-explore-discover-search";
import { withE2eFixtures } from "./helpers/explore-test-fixtures";
import { requireExploreNavigationReady } from "./helpers/wait-explore-feed-ready";

/**
 * Unified Discover navigation journeys for the long-lived Explore session.
 */
test.describe("discover navigation", () => {
  test("search opens the quick panel over the feed without leaving /explore", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await openExploreHeaderDiscoverSearch(page);

    await expect(page.getByRole("dialog", { name: "Discover" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/explore(\?|$)/);
    expect(new URL(page.url()).searchParams.get("tab")).not.toBe("discover");
  });

  test("the sheet X closes the quick panel and reveals the feed", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await openExploreHeaderDiscoverSearch(page);

    const dialog = page.getByRole("dialog", { name: "Discover" });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Close discover panel" }).click();
    await expect(dialog).not.toBeVisible();
    await requireExploreNavigationReady(page, 30_000);
  });

  test("session shell keeps the feed mounted on the Discover surface (no remount)", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore?tab=discover"));
    await expect(
      page.getByRole("heading", { name: "Spotlight" }).first()
    ).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
  });

  test("dedicated Discover hands standard clips to the Explore reel", async ({
    page,
  }) => {
    await page.goto("/e2e/discover-explore-handoff");

    const card = page.getByTestId("discover-content-card").first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await expect(page).toHaveURL(/\/explore\?.*channel=/, { timeout: 15_000 });
  });

  test("rapid tag switch shows results for the last selected tag", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore?tab=discover"));
    await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
      timeout: 30_000,
    });

    const row = discoverTagRow(page);
    await row.getByRole("button", { name: "Concert", exact: true }).click();
    await row.getByRole("button", { name: "Comedy", exact: true }).click();

    await expect(page.getByText("Results for 'Comedy'")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Results for 'Concert'")).not.toBeVisible();
  });
});
