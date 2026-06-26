import { test, expect } from "@playwright/test";

test.describe("explore", () => {
  test("loads feed first on default explore URL", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.locator("body")).toBeVisible();

    const scroll = page.getByTestId("explore-feed-scroll");
    const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
    const discoverHeading = page.getByRole("heading", {
      name: "Discover contents",
    });

    await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });
    await expect(discoverHeading).not.toBeVisible();
  });

  test("first paint includes SSR default feed boot or visible slide", async ({
    page,
  }) => {
    const response = await page.goto("/explore");
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
    await page.goto("/explore");
    await expect(page.locator("body")).toBeVisible();

    const scroll = page.getByTestId("explore-feed-scroll");
    const emptyCopy = page.getByText(/no clips available|sign in to browse/i);

    await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });

    if (await scroll.isVisible()) {
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
      await expect(emptyCopy.first()).toBeVisible();
    }
  });

  test("slide actions live inside active slide footer", async ({ page }) => {
    await page.goto("/explore");
    const scroll = page.getByTestId("explore-feed-scroll");
    if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip();
      return;
    }
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
    await page.goto("/explore");
    await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("discover tab shows distinct category headings", async ({ page }) => {
    await page.goto("/explore?tab=discover");
    await expect(page.getByRole("heading", { name: "Spotlight" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Recommended for you" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
  });
});
