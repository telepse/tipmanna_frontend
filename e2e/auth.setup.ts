/**
 * Staging-only authenticated Playwright setup.
 *
 * Required environment:
 * - PLAYWRIGHT_AUTH_E2E=1
 * - PLAYWRIGHT_TIPPER_EMAIL
 * - PLAYWRIGHT_BASE_URL (staging frontend)
 * - PLAYWRIGHT_BACKEND_URL (staging API root, no /api/v1 suffix)
 *
 * Verification code (one of):
 * - Protected staging helper: TIPMANNA_E2E_AUTH_CODE=1 + PLAYWRIGHT_E2E_AUTH_HELPER_SECRET
 * - Local helper: TIPMANNA_E2E_AUTH_CODE=1 on non-production backend
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
  reportAuthEnvPresence,
} from "./helpers/auth-tipper-setup";
import {
  hostnameFromUrl,
  resolvePlaywrightBackendRoot,
} from "./helpers/playwright-backend-config";

const authFile = path.join(__dirname, "../.auth/tipper.json");

setup("authenticate disposable tipper account", async ({ page }) => {
  setup.skip(
    process.env.PLAYWRIGHT_AUTH_E2E !== "1",
    "Set PLAYWRIGHT_AUTH_E2E=1 for authenticated E2E"
  );

  const email = process.env.PLAYWRIGHT_TIPPER_EMAIL?.trim();
  setup.skip(!email, "PLAYWRIGHT_TIPPER_EMAIL is required");

  const backendResolution = resolvePlaywrightBackendRoot();
  if (!backendResolution.ok) {
    throw new Error(backendResolution.reason);
  }

  console.info(
    JSON.stringify({
      event: "auth_setup_env",
      env: reportAuthEnvPresence(),
      frontendHost: hostnameFromUrl(process.env.PLAYWRIGHT_BASE_URL),
      backendHost: hostnameFromUrl(backendResolution.backendRoot),
    })
  );

  await page.goto("/sign-in");
  await page.getByTestId("signin-tab-tipper").click();
  await page.getByLabel(/^email$/i).fill(email as string);
  await page.getByTestId("signin-tipper-submit").click();

  await expect(page).toHaveURL(/\/verify-email/, { timeout: 30_000 });

  const codeResult = await fetchE2eVerificationCode(email as string);
  console.info(
    JSON.stringify({
      event: "auth_setup_code_fetch",
      method: codeResult.method,
      backendHost: codeResult.backendHost,
      httpStatus: codeResult.httpStatus ?? null,
      error: codeResult.error ?? null,
    })
  );

  if (!codeResult.code) {
    throw new Error(
      codeResult.error ??
        "Could not obtain staging verification code (helper/inbox unavailable)"
    );
  }

  await fillOtpInputs(page, codeResult.code);
  await page.getByRole("button", { name: /verify email/i }).click();

  await expect(page).not.toHaveURL(/\/verify-email/, { timeout: 30_000 });

  await page.goto("/explore");
  await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
    timeout: 60_000,
  });

  mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
