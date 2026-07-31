/**
 * Staging-only authenticated Playwright setup.
 *
 * Required environment:
 * - PLAYWRIGHT_AUTH_E2E=1
 * - PLAYWRIGHT_TIPPER_EMAIL
 * - PLAYWRIGHT_BASE_URL (staging)
 *
 * Verification code (one of):
 * - TIPMANNA_E2E_AUTH_CODE=1 on backend (non-production) + polling helper
 * - PLAYWRIGHT_TIPPER_OTP_SECRET as a 6-digit staging code
 *
 * Never commit `.auth/tipper.json`.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";

import {
  fetchE2eVerificationCode,
  fillOtpInputs,
} from "./helpers/auth-tipper-setup";

const authFile = path.join(__dirname, "../.auth/tipper.json");

setup("authenticate disposable tipper account", async ({ page }) => {
  setup.skip(
    process.env.PLAYWRIGHT_AUTH_E2E !== "1",
    "Set PLAYWRIGHT_AUTH_E2E=1 for authenticated E2E"
  );

  const email = process.env.PLAYWRIGHT_TIPPER_EMAIL?.trim();
  setup.skip(!email, "PLAYWRIGHT_TIPPER_EMAIL is required");

  await page.goto("/sign-in");
  await page.getByTestId("signin-tab-tipper").click();
  await page.getByLabel(/^email$/i).fill(email as string);
  await page.getByTestId("signin-tipper-submit").click();

  await expect(page).toHaveURL(/\/verify-email/, { timeout: 30_000 });

  const code = await fetchE2eVerificationCode(email as string);
  if (!code) {
    setup.skip(true, "Could not obtain staging verification code");
    return;
  }

  await fillOtpInputs(page, code);
  await page.getByRole("button", { name: /verify email/i }).click();

  await expect(page).not.toHaveURL(/\/verify-email/, { timeout: 30_000 });

  await page.goto("/explore");
  await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
    timeout: 60_000,
  });

  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
