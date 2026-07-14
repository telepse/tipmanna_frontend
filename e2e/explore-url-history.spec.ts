import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";

test.describe("explore URL history", () => {
  test("filter change updates URL and browser back restores prior filter", async ({
    page,
  }) => {
    await gotoExplore(page);
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 45_000 });

    const filterToggle = page
      .getByRole("button", { name: /open filters|close filters/i })
      .first();
    if (
      !(await filterToggle.isVisible({ timeout: 5_000 }).catch(() => false))
    ) {
      test.skip(true, "Filter UI not visible in this environment");
      return;
    }
    await filterToggle.click();

    const comedyFilter = page
      .getByTestId("explore-filter-type")
      .filter({ hasText: "Comedy" });
    if (
      !(await comedyFilter.isVisible({ timeout: 5_000 }).catch(() => false))
    ) {
      test.skip(true, "Comedy filter chip not available");
      return;
    }

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
    await gotoExplore(page);
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "Saves" }).click();
    await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
    const savesUrl = page.url();

    await page.getByRole("button", { name: "Trends" }).click();
    await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });

    await page.goBack();
    await expect(page).toHaveURL(/feedTab=saves/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Saves" })).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );

    await page.goForward();
    await expect.poll(() => page.url(), { timeout: 10_000 }).not.toBe(savesUrl);
  });

  test("feedTab deep link hydrates saves sub-tab", async ({ page }) => {
    await gotoExplore(page, "/explore?feedTab=saves");
    await expect(page.getByRole("button", { name: "Saves" })).toHaveClass(
      /bg-white/,
      { timeout: 15_000 }
    );
  });

  test("feedTab=tv deep link shows TV surface with mounted feed shell", async ({
    page,
  }) => {
    await gotoExplore(page, "/explore?feedTab=tv");
    await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
      /bg-white/,
      { timeout: 15_000 }
    );
    await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
    await expect(page.getByTestId("explore-feed-shell")).toHaveClass(/hidden/);
  });

  test("feedTab tv back forward restores sub-tab", async ({ page }) => {
    await gotoExplore(page);
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "TV" }).click();
    await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });

    await page.getByRole("button", { name: "Trends" }).click();
    await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });

    await page.goBack();
    await expect(page).toHaveURL(/feedTab=tv/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );

    await page.goForward();
    await expect(page).toHaveURL(/feedTab=trends/, { timeout: 10_000 });
  });
});
