import { test, expect } from "@playwright/test";

import { assertPlaywrightBackendAligned } from "./helpers/playwright-backend-config";
import { loadStreamingB1Seed } from "./helpers/streaming-b1-seed";

/**
 * LIVE-014 / LIVE-018 — agent-executable host Advanced Studio journey (disposable PG + mock provider).
 *
 * **Provider:** `STREAMING_PROVIDER_EXECUTION_MODE=mock` — compositor/Daily/RTMP not validated here.
 * **Excluded:** physical second device, billable Daily contributor join, real RTMP layout (Exp-05 / owner manual).
 *
 * Auth setup project is infrastructure, not a separate product journey.
 */
const enabled = process.env.STREAMING_B1_E2E === "1";

function broadcastPath(seed: ReturnType<typeof loadStreamingB1Seed>): string {
  const eventId =
    process.env.STREAMING_B1_E2E_EVENT_ID?.trim() ?? seed.eventId;
  const hostSlug =
    process.env.STREAMING_B1_E2E_HOST_SLUG?.trim() ?? seed.hostSlug;
  return `/host/${hostSlug}/broadcast/${eventId}`;
}

test.describe("host advanced studio (disposable API)", () => {
  test.skip(!enabled, "Set STREAMING_B1_E2E=1 with disposable backend");

  test("LIVE-014/018 — prep → director → mock contributor → activate → programme → downgrade", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const backend = assertPlaywrightBackendAligned();
    const health = await page.request.get(`${backend.backendRoot}/health`);
    expect(health.ok()).toBeTruthy();

    const seed = loadStreamingB1Seed();
    const path = broadcastPath(seed);

    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Advanced Studio/i })
    ).toBeVisible({ timeout: 120_000 });
    await expect(
      page
        .getByTestId("stream-branding-preview")
        .or(page.getByText(/No branding rotation configured/i))
    ).toBeVisible({ timeout: 30_000 });

    // A27-B1: 2× only after explicit activate — rate stays standard through prep
    const prepDd = page.locator('dt:has-text("Prep") + dd');
    const rateDd = page.locator('dt:has-text("Rate") + dd');
    await expect(rateDd).toHaveText("standard", { timeout: 30_000 });

    const prepBefore = (await prepDd.textContent())?.trim();
    if (prepBefore === "none") {
      await page.getByRole("button", { name: "Set up Advanced" }).click();
      await expect(page.getByText("Advanced preparation started")).toBeVisible({
        timeout: 30_000,
      });
    }
    await expect(prepDd).toHaveText("preparing", { timeout: 30_000 });
    await expect(rateDd).toHaveText("standard");

    // Activation gate: contributor + director required (409 surfaced in UI)
    await page.getByRole("button", { name: "Activate Advanced" }).click();
    await expect(page.getByRole("status")).toContainText(
      /contributor|director|not ready|CONTRIBUTOR|DIRECTOR/i,
      { timeout: 15_000 }
    );

    await page.getByRole("button", { name: "Claim director" }).click();
    await expect(page.getByText("Director lease acquired")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Create invite" }).click();
    await expect(
      page.getByText(/Invite created|share token/i)
    ).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("button", { name: "Redeem invite (this browser)" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Contributor preview session",
      { timeout: 30_000 }
    );

    await page.getByRole("button", { name: "Activate Advanced" }).click();
    await expect(page.getByText(/Advanced activated|2× rate/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("dd", { hasText: "active" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("dd", { hasText: "advanced" })).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Camera A" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Split view" }).click();
    await expect(page.getByText(/Programme: split/i)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Return to Standard" }).click();
    await expect(page.getByText("Returned to Standard")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("dd", { hasText: "standard" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator("dd", { hasText: "none" })).toBeVisible();
  });

  test("LIVE-014 — unauthenticated host broadcast route redirects to sign-in", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const seed = loadStreamingB1Seed();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3014");
    await page.evaluate(() => {
      localStorage.setItem(
        "persist:root",
        JSON.stringify({
          auth: JSON.stringify({
            user: null,
            token: null,
            isAuthenticated: false,
            requiresVerification: false,
            tag: null,
            persistAuthHydrationComplete: true,
          }),
          tip: JSON.stringify({}),
          _persist: JSON.stringify({ version: -1, rehydrated: true }),
        })
      );
    });
    await page.goto(broadcastPath(seed));
    await expect(page).toHaveURL(/sign-in|signin/i, { timeout: 60_000 });
    await context.close();
  });
});
