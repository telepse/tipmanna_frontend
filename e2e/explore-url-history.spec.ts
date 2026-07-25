import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import {
  openExploreFilters,
  exploreFilterTypeChip,
} from "./helpers/explore-filter-helpers";
import { withE2eFixtures } from "./helpers/explore-test-fixtures";
import { requireExploreNavigationReady } from "./helpers/wait-explore-feed-ready";

test.describe("explore URL history", () => {
  test("filter change updates URL and browser back restores prior filter", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await requireExploreNavigationReady(page, 45_000);

    await openExploreFilters(page);
    const comedyFilter = exploreFilterTypeChip(page, "Comedy");
    await comedyFilter.click();
    await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 10_000 });
    const urlAfterFilter = page.url();

    await page.goBack();
    await expect
      .poll(() => page.url(), { timeout: 10_000 })
      .not.toBe(urlAfterFilter);

    await page.goForward();
    await expect(page).toHaveURL(/feedTypes=.*COMEDY/i, { timeout: 10_000 });
    await expect(comedyFilter).toHaveClass(/border-primary/);
  });

  test("saves sub-tab survives browser back and forward", async ({ page }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await requireExploreNavigationReady(page, 45_000);

    await page.getByTestId("explore-subtab-saves").click();
    await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
    const savesUrl = page.url();

    await page.getByTestId("explore-subtab-trends").click();
    await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });

    await page.goBack();
    await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
    await expect(page.getByTestId("explore-subtab-saves")).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );

    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).not.toBe(savesUrl);
  });

  test("feedTab deep link hydrates saves sub-tab", async ({ page }) => {
    await gotoExplore(page, withE2eFixtures("/explore?feedTab=saves"));
    await expect(page.getByRole("button", { name: "Saves" })).toHaveClass(
      /bg-white/,
      { timeout: 15_000 }
    );
  });

  test("feedTab=tv deep link shows TV surface with mounted feed shell", async ({
    page,
  }) => {
    await gotoExplore(page, withE2eFixtures("/explore?feedTab=tv&e2eTv=1"));
    await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
      /bg-white/,
      { timeout: 15_000 }
    );
    await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
    await expect(page.getByTestId("explore-feed-shell")).toHaveClass(/hidden/);
  });

  test("feedTab tv back forward restores sub-tab", async ({ page }) => {
    await gotoExplore(page, withE2eFixtures("/explore"));
    await requireExploreNavigationReady(page, 45_000);

    await page.getByTestId("explore-subtab-tv").click();
    await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });

    await page.getByTestId("explore-subtab-trends").click();
    await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });

    await page.goBack();
    await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });
    await expect(page.getByTestId("explore-subtab-tv")).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );

    await page.goForward();
    await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  });
});
