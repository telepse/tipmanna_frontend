import { test, expect } from "@playwright/test";

async function openCreateTypePicker(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();

  const createButton = page.getByRole("button", { name: /^create$/i }).first();
  await expect(createButton).toBeVisible({ timeout: 30_000 });
  await createButton.click();

  const createDialog = page.getByRole("dialog");
  await expect(createDialog).toBeVisible();
  await expect(
    createDialog.getByRole("heading", { name: /what are you creating/i })
  ).toBeVisible();
  return createDialog;
}

async function openSignInFromCreateProceed(
  page: import("@playwright/test").Page
) {
  const createDialog = await openCreateTypePicker(page);
  await createDialog.getByText("Event channel", { exact: true }).click();
  await createDialog.getByRole("button", { name: /^proceed$/i }).click();

  const signInDialog = page.getByRole("dialog", {
    name: /sign in to continue/i,
  });
  await expect(signInDialog).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /what are you creating/i })
  ).toBeHidden();
  return signInDialog;
}

test.describe("create dialog sign-in restore", () => {
  test("create modal opens and host sign-in path is reachable via Proceed", async ({
    page,
  }) => {
    const signInDialog = await openSignInFromCreateProceed(page);
    await expect(page.getByTestId("signin-tab-host")).toBeVisible();
    await expect(signInDialog).toBeVisible();
  });

  test("host sign-up inputs are editable in create modal sign-in", async ({
    page,
  }) => {
    const signInDialog = await openSignInFromCreateProceed(page);

    await signInDialog.getByRole("button", { name: /^sign up$/i }).click();

    const fullNameInput = signInDialog.getByLabel(/full name/i);
    const emailInput = signInDialog.getByLabel(/^email$/i);

    await expect(fullNameInput).toBeEnabled();
    await expect(emailInput).toBeEnabled();

    await fullNameInput.fill("Test Host");
    await emailInput.fill("test-host@example.com");

    await expect(fullNameInput).toHaveValue("Test Host");
    await expect(emailInput).toHaveValue("test-host@example.com");
  });

  test("forgot password stays inside create modal sign-in", async ({
    page,
  }) => {
    const signInDialog = await openSignInFromCreateProceed(page);

    await signInDialog
      .getByRole("button", { name: /forgot password/i })
      .click();

    await expect(
      signInDialog.getByRole("heading", { name: /reset your password/i })
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/forgot-password/);
  });

  test("dismissing sign-in restores create picker", async ({ page }) => {
    await openSignInFromCreateProceed(page);

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("heading", { name: /what are you creating/i })
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: /sign in to continue/i })
    ).toBeHidden();
  });
});
