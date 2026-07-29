/**
 * Staging-only authenticated Playwright setup.
 *
 * Required environment:
 * - PLAYWRIGHT_AUTH_E2E=1
 * - PLAYWRIGHT_TIPPER_EMAIL
 * - PLAYWRIGHT_TIPPER_OTP_SECRET or PLAYWRIGHT_TIPPER_PASSWORD (project-specific)
 * - PLAYWRIGHT_BASE_URL (staging)
 *
 * Never commit `.auth/tipper.json`.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";

const authFile = path.join(__dirname, "../.auth/tipper.json");

setup("authenticate disposable tipper account", async ({ page }) => {
  setup.skip(
    process.env.PLAYWRIGHT_AUTH_E2E !== "1",
    "Set PLAYWRIGHT_AUTH_E2E=1 for authenticated E2E"
  );

  const email = process.env.PLAYWRIGHT_TIPPER_EMAIL;
  setup.skip(!email, "PLAYWRIGHT_TIPPER_EMAIL is required");

  await page.goto("/explore");
  await page
    .getByRole("button", { name: /Not signed in|Guest|Signed in/i })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });

  const otpSecret = process.env.PLAYWRIGHT_TIPPER_OTP_SECRET;
  if (otpSecret) {
    // Project-specific OTP helper hook — supply secret via CI only.
    await page.getByLabel(/email/i).fill(email as string);
    await page
      .getByRole("button", { name: /continue|send code|sign in/i })
      .click();
    setup.skip(true, "Wire OTP entry against staging auth helper");
  } else {
    setup.skip(
      true,
      "Provide PLAYWRIGHT_TIPPER_OTP_SECRET or extend setup with password auth"
    );
  }

  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
