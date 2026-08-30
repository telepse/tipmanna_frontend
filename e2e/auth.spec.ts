import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("host and tipper tabs switch forms", async ({ page }) => {
    await page.getByTestId("signin-tab-host").click();
    await expect(page.getByPlaceholder("Enter email address")).toBeVisible();
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
    await expect(page.getByTestId("signin-request-login-code")).toBeVisible();

    await page.getByTestId("signin-tab-tipper").click();
    await expect(page.getByPlaceholder("Enter email address")).toBeVisible();
    await expect(page.getByPlaceholder("Enter password")).toHaveCount(0);
    await expect(page.getByTestId("signin-tipper-submit")).toBeVisible();
  });

  test("tipper submit validates email before OTP flow", async ({ page }) => {
    await page.getByTestId("signin-tab-tipper").click();
    await page.getByTestId("signin-tipper-submit").click();
    await expect(page.getByText(/invalid email address/i)).toBeVisible();
  });

  test("host login code shortcut is visible on host tab", async ({ page }) => {
    await page.getByTestId("signin-tab-host").click();
    await expect(page.getByTestId("signin-request-login-code")).toBeVisible();
  });
});
