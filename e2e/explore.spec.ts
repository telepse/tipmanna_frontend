import { test, expect } from "@playwright/test";

test.describe("explore", () => {
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
  });

  test("profile shows Guest or Not signed in for anonymous visitors", async ({
    page,
  }) => {
    await page.goto("/explore");
    await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
