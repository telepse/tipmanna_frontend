import { test, expect } from "@playwright/test";

/**
 * Unified Discover navigation journeys for the long-lived Explore session.
 * Covers: search = quick-panel only (no tab nav), the sheet X closes back to
 * the feed, the session shell keeps the feed mounted on non-feed surfaces, and
 * the dedicated /discover page hands standard clips off to the Explore reel.
 */
test.describe("discover navigation", () => {
  const openHeaderSearch = async (page: import("@playwright/test").Page) => {
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 45_000 });

    // Desktop viewport: mobile search wrapper is `sm:hidden`; target visible input.
    const search = page.locator(
      'input[placeholder="Search videos..."]:visible'
    );
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.click();
    await search.fill("music");
    await search.press("Enter");
  };

  test("search opens the quick panel over the feed without leaving /explore", async ({
    page,
  }) => {
    await page.goto("/explore");
    await openHeaderSearch(page);

    // Quick panel (sheet) overlays the feed.
    await expect(page.getByRole("dialog", { name: "Discover" })).toBeVisible({
      timeout: 30_000,
    });
    // Unified nav must NOT switch the user to the full Discover tab.
    await expect(page).toHaveURL(/\/explore(\?|$)/);
    expect(new URL(page.url()).searchParams.get("tab")).not.toBe("discover");
  });

  test("the sheet X closes the quick panel and reveals the feed", async ({
    page,
  }) => {
    await page.goto("/explore");
    await openHeaderSearch(page);

    const dialog = page.getByRole("dialog", { name: "Discover" });
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Close discover panel" }).click();
    await expect(dialog).not.toBeVisible();

    // Feed is the active surface again.
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("session shell keeps the feed mounted on the Discover surface (no remount)", async ({
    page,
  }) => {
    // The Discover surface renders alongside a mounted-but-hidden feed so the
    // reel session (playback, caches, subscriptions) survives surface switches.
    await page.goto("/explore?tab=discover");
    await expect(
      page.getByRole("heading", { name: "Spotlight" }).first()
    ).toBeVisible({
      timeout: 30_000,
    });

    // Feed scroll container stays in the DOM even though Discover is active.
    await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();
  });

  test("dedicated Discover hands standard clips to the Explore reel", async ({
    page,
  }) => {
    await page.goto("/discover");

    const card = page.getByTestId("discover-content-card").first();
    if (!(await card.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "No standard clips in catalog for this environment");
      return;
    }

    await card.click();
    // Handoff opens the clip in the Explore reel session, not a separate page.
    await expect(page).toHaveURL(/\/explore\?.*channel=/, { timeout: 15_000 });
  });
});
