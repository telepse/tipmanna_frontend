import { test, expect } from "@playwright/test";

import { assertPlaywrightBackendAligned } from "./helpers/playwright-backend-config";

/**
 * Host Advanced Studio dashboard smoke against disposable/local API (LIVE-014 / Finish B).
 * Requires: backend on PLAYWRIGHT_BACKEND_URL with Advanced flag on + seeded host session.
 */
const enabled = process.env.STREAMING_B1_E2E === "1";

test.describe("host advanced studio (disposable API)", () => {
  test.skip(!enabled, "Set STREAMING_B1_E2E=1 with disposable backend");

  test("backend health + Advanced Studio panel test id when broadcast loaded", async ({
    page,
  }) => {
    const backend = assertPlaywrightBackendAligned();
    const health = await page.request.get(`${backend.backendRoot}/health`);
    expect(health.ok()).toBeTruthy();

    const eventId = process.env.STREAMING_B1_E2E_EVENT_ID;
    const hostSlug = process.env.STREAMING_B1_E2E_HOST_SLUG;
    if (!eventId || !hostSlug) {
      test.skip(true, "STREAMING_B1_E2E_EVENT_ID and STREAMING_B1_E2E_HOST_SLUG required");
    }

    await page.goto(`/host/${hostSlug}/broadcast/${eventId}`);
    await expect(page.getByRole("heading", { name: /Advanced Studio/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("stream-branding-preview")).toBeVisible();
  });
});
