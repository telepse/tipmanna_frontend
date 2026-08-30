import { test, expect } from "@playwright/test";

test.describe("discover live routing", () => {
  test("live stream cards open in Explore reel (fixture page)", async ({
    page,
  }) => {
    await page.goto("/e2e/discover-live-routing");
    const card = page.getByTestId("discover-live-stream-card");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/explore\?.*channel=e2e-live-channel/, {
      timeout: 15_000,
    });
  });

  test("live stream cards open in Explore on discover page", async ({
    page,
  }) => {
    await page.goto("/discover");
    await expect(
      page.getByRole("heading", { name: "Live streams" }).first()
    ).toBeVisible({
      timeout: 30_000,
    });

    const card = page.getByTestId("discover-live-stream-card").first();
    if (!(await card.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No live streams in catalog for this environment");
      return;
    }

    await card.click();
    await expect(page).toHaveURL(/\/explore\?.*channel=/, { timeout: 15_000 });
  });
});
