import { test, expect } from "@playwright/test";

test.describe("discover live routing", () => {
  test("live stream cards navigate to channel room (fixture page)", async ({
    page,
  }) => {
    await page.goto("/e2e/discover-live-routing");
    const card = page.getByTestId("discover-live-stream-card");
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/channel\/e2e-live-event/);
  });

  test("live stream cards navigate to channel room on discover", async ({
    page,
  }) => {
    await page.goto("/discover");
    await expect(
      page.getByRole("heading", { name: "Live streams" })
    ).toBeVisible({
      timeout: 30_000,
    });

    const card = page.getByTestId("discover-live-stream-card").first();
    if (!(await card.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No live streams in catalog for this environment");
      return;
    }

    await card.click();
    await expect(page).toHaveURL(/\/channel\//, { timeout: 15_000 });
  });
});
