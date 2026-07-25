import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

test.describe("explore", () => {
  test("loads feed first on default explore URL", async ({ page }) => {
    await gotoExplore(page);
    await expect(page.locator("body")).toBeVisible();

    await waitExploreFeedReady(page);

    const discoverHeading = page.getByRole("heading", {
      name: "Discover contents",
    });
    await expect(discoverHeading).not.toBeVisible();
  });

  test("first paint includes SSR default feed boot or visible slide", async ({
    page,
  }) => {
    const response = await gotoExplore(page);
    expect(response?.ok()).toBeTruthy();
    const html = await page.content();
    const hadInlineBoot =
      html.includes("__EXPLORE_SSR_BOOT__") ||
      html.includes("data-explore-slide");
    expect(hadInlineBoot).toBeTruthy();
  });

  test("feed scrolls and shows video shell or empty state", async ({
    page,
  }) => {
    await gotoExplore(page);
    await expect(page.locator("body")).toBeVisible();

    const state = await waitExploreFeedReady(page);

    if (state.state === "scroll") {
      const scroll = page.getByTestId("explore-feed-scroll");
      await scroll.evaluate(el => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(
        page
          .getByTestId("explore-video-shell")
          .or(page.locator("[data-explore-slide]"))
          .first()
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/no clips available|sign in to browse/i).first()
      ).toBeVisible();
    }
  });

  test("slide actions live inside active slide footer", async ({ page }) => {
    await gotoExplore(page);
    const state = await waitExploreFeedReady(page, 15_000);
    if (state.state !== "scroll") {
      test.skip();
      return;
    }
    const scroll = page.getByTestId("explore-feed-scroll");
    const actions = page.getByTestId("explore-slide-actions");
    await expect(actions).toBeVisible({ timeout: 15_000 });
    const slide = page.locator('[data-explore-slide][data-index="0"]');
    await expect(
      slide.locator('[data-testid="explore-slide-actions"]')
    ).toBeVisible();
    await expect(actions).toHaveClass(/bg-gradient-to-t/);
    await expect(actions).not.toHaveClass(/bg-black\/80/);
  });

  test("profile shows Guest or Not signed in for anonymous visitors", async ({
    page,
  }) => {
    await gotoExplore(page);
    await waitExploreFeedReady(page);
    await expect(
      page.getByRole("button", { name: /Signed in|Guest|Not signed in/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("discover tab shows distinct category headings", async ({ page }) => {
    await gotoExplore(page, "/explore?tab=discover");

    const discoverPanel = page.getByRole("heading", {
      name: "Discover contents",
    });
    const spotlightHeading = page
      .locator("h5")
      .filter({ hasText: /^Spotlight$/ });

    await expect(async () => {
      await expect(discoverPanel).toBeVisible();
      await expect(spotlightHeading).toBeVisible();
    }).toPass({ timeout: 45_000 });

    await expect(
      page.locator("h5").filter({ hasText: /^Spotlight$/ })
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      page.locator("h5").filter({ hasText: /^Recommended for you$/ })
    ).toBeVisible();

    await expect(
      page.locator("h5").filter({ hasText: /^Programs$/ })
    ).toBeVisible();
  });
});
