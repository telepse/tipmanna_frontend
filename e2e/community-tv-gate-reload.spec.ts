import { test, expect } from "@playwright/test";

const COMM =
  process.env.STAGEF_COMMUNITY_ID ?? "588a3682-c0c8-4284-b466-bd3e4a43b801";

test.describe("Community TV gate — anonymous reload", () => {
  test("hard reload shows denied gate (no indefinite Loading TV)", async ({
    page,
  }) => {
    const protectedSchedule: string[] = [];
    page.on("request", req => {
      const u = req.url();
      if (
        u.includes(`/communities/${COMM}/tv`) &&
        !u.includes("access-state")
      ) {
        protectedSchedule.push(u);
      }
    });

    await page.goto(`/tv?community=${encodeURIComponent(COMM)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: /community members only/i })
    ).toBeVisible({ timeout: 60_000 });

    for (let i = 0; i < 3; i++) {
      protectedSchedule.length = 0;
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: /community members only/i })
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText("Loading TV…")).toHaveCount(0);
      expect(protectedSchedule).toHaveLength(0);
    }
  });

  test("global /tv has no members-only gate", async ({ page }) => {
    await page.goto("/tv", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /community members only/i })
    ).toHaveCount(0);
    await expect(page.getByTestId("tv-nav-tips").first()).toBeVisible({
      timeout: 90_000,
    });
  });
});
