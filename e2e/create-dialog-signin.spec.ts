import { test, expect } from "@playwright/test";

test.describe("create dialog sign-in restore", () => {
  test("create modal opens and host sign-in path is reachable", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    const createButton = page
      .getByRole("button", { name: /^create$/i })
      .first();
    await expect(createButton).toBeVisible({ timeout: 30_000 });
    await createButton.click();

    const createDialog = page.getByRole("dialog");
    await expect(createDialog).toBeVisible();
    await expect(
      createDialog.getByRole("heading", { name: /what are you creating/i })
    ).toBeVisible();

    await createDialog.getByRole("button", { name: /^host$/i }).click();

    await expect(
      page.getByRole("dialog", { name: /sign in to continue/i })
    ).toBeVisible();
    await expect(page.getByTestId("signin-tab-host")).toBeVisible();
  });
});
