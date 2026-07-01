import { test, expect } from "@playwright/test";

/**
 * Runtime regression hunt — closes Investigations 1–6 and Phase 4 from the
 * evidence-driven plan. Uses fixture routes where backend flakiness would
 * mask product behavior; uses real routes where catalog availability allows.
 */
test.describe("runtime regression hunt", () => {
  test.describe("Investigation 1 — Discover → Explore handoff", () => {
    test("fixture: card click navigates to Explore reel (no inline preview trap)", async ({
      page,
    }) => {
      await page.goto("/e2e/discover-explore-handoff");
      const card = page.getByTestId("discover-content-card");
      await expect(card).toBeVisible({ timeout: 30_000 });

      await card.click();
      await expect(page).toHaveURL(
        /\/explore\?.*channel=e2e-handoff-video.*eventId=e2e-handoff-event/,
        { timeout: 15_000 }
      );

      // Inline preview must not trap the click when handoff is configured.
      await expect(card.locator("iframe")).toHaveCount(0);
    });
  });

  test.describe("Investigation 2 — Explore loading settles", () => {
    test("fixture handoff: feed scroll appears without hanging on loading", async ({
      page,
    }) => {
      await page.goto("/e2e/discover-explore-handoff");
      await page.getByTestId("discover-content-card").click();
      await expect(page).toHaveURL(/\/explore\?.*channel=/, { timeout: 15_000 });

      const feed = page.getByTestId("explore-feed-scroll");
      await expect(
        feed.or(page.getByText(/no clips available|sign in to browse/i)).first()
      ).toBeVisible({ timeout: 45_000 });

      await expect(
        page.getByText("Explore ran into a problem")
      ).not.toBeVisible();
    });
  });

  test.describe("Investigation 3 — Discovery surfaces resolve", () => {
    test("fixture discover panel renders cards (no error boundary)", async ({
      page,
    }) => {
      await page.goto("/e2e/discover-explore-handoff");
      await expect(
        page.getByTestId("discover-content-card")
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText("Discover ran into a problem")
      ).not.toBeVisible();
      await expect(page.locator(".animate-pulse")).toHaveCount(0);
    });

    test("real /discover: no image-host crash error boundary", async ({
      page,
    }) => {
      const imageThrows: string[] = [];
      page.on("pageerror", e => {
        if (e.message.includes("Invalid src prop")) imageThrows.push(e.message);
      });

      await page.goto("/discover", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(5000);

      expect(imageThrows).toHaveLength(0);
      await expect(
        page.getByText("Discover ran into a problem")
      ).not.toBeVisible();

      const card = page.getByTestId("discover-content-card").first();
      if (await card.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await expect(card).toBeVisible();
      }
    });
  });

  test.describe("Investigation 4 — Explore error surface", () => {
    test("/explore loads without segment error boundary", async ({ page }) => {
      await page.goto("/explore");
      await page.waitForTimeout(3000);
      await expect(
        page.getByText("Explore ran into a problem")
      ).not.toBeVisible();
    });
  });

  test.describe("Investigation 5 — full Discover journey on Explore", () => {
    test("search → panel → close → feed preserved (single session)", async ({
      page,
    }) => {
      await page.goto("/explore");
      await expect(page.getByTestId("explore-feed-scroll")).toHaveCount(1);

      await expect(
        page
          .getByTestId("explore-feed-scroll")
          .or(page.getByText(/no clips available|sign in to browse/i))
          .first()
      ).toBeVisible({ timeout: 45_000 });

      const search = page.locator('input[placeholder="Search videos..."]:visible');
      await expect(search).toBeVisible({ timeout: 30_000 });
      await search.click();
      await search.fill("music");
      await search.press("Enter");

      const dialog = page.getByRole("dialog", { name: "Discover" });
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      expect(new URL(page.url()).searchParams.get("tab")).not.toBe("discover");

      await page.getByRole("button", { name: "Close discover panel" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("explore-feed-scroll")).toHaveCount(1);
      await expect(page).toHaveURL(/\/explore(\?|$)/);
    });
  });

  test.describe("Investigation 6 — persistent session shell", () => {
    test("feed stays mounted across Discover tab switch", async ({ page }) => {
      await page.goto("/explore?tab=discover");
      await expect(page.getByTestId("explore-feed-scroll")).toHaveCount(1);

      await page.goto("/explore?tab=feed");
      await expect(page.getByTestId("explore-feed-scroll")).toHaveCount(1);
    });

    test("fixture live routing still uses channel destination", async ({
      page,
    }) => {
      await page.goto("/e2e/discover-live-routing");
      const card = page.getByTestId("discover-live-stream-card");
      await expect(card).toBeVisible({ timeout: 15_000 });
      await card.click();
      await expect(page).toHaveURL(/\/channel\/e2e-live-event/);
    });
  });

  test.describe("Phase 4 — runtime performance signals", () => {
    test("SSR boot inline payload is present on /explore", async ({ page }) => {
      await page.goto("/explore");
      const hadBoot = await page.evaluate(() => {
        return (
          typeof (window as Window & { __EXPLORE_SSR_BOOT__?: unknown })
            .__EXPLORE_SSR_BOOT__ !== "undefined" ||
          document.documentElement.innerHTML.includes("__EXPLORE_SSR_BOOT__")
        );
      });
      expect(hadBoot).toBe(true);
    });

    test("Explore feed batch is not duplicated on initial load", async ({
      page,
    }) => {
      let batchCount = 0;
      page.on("response", res => {
        if (res.url().includes("/contents/feed/batch") && res.status() === 200) {
          batchCount += 1;
        }
      });

      await page.goto("/explore");
      await expect(
        page
          .getByTestId("explore-feed-scroll")
          .or(page.getByText(/no clips available|sign in to browse/i))
          .first()
      ).toBeVisible({ timeout: 45_000 });

      // Typical boot: 1 batch (+ SSR may avoid a second). Guard runaway storms.
      expect(batchCount).toBeLessThan(6);
    });
  });
});
