import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import { withE2eFixtures } from "./helpers/explore-test-fixtures";

test.describe("Explore TV handoff", () => {
  test("deterministic dual-gated programme handoff (20x)", async ({ page }) => {
    test.setTimeout(240_000);
    let pass = 0;
    for (let i = 0; i < 20; i += 1) {
      await gotoExplore(page, withE2eFixtures("/explore?feedTab=tv&e2eTv=1"));
      await expect(page.getByTestId("explore-subtab-tv")).toHaveClass(
        /bg-white/,
        {
          timeout: 15_000,
        }
      );

      const watch = page.getByTestId("explore-tv-watch").first();
      await expect(watch).toBeVisible({ timeout: 15_000 });
      await watch.click();

      await expect(page.getByTestId("explore-subtab-trends")).toHaveClass(
        /bg-white/,
        { timeout: 15_000 }
      );
      await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
        timeout: 45_000,
      });
      await expect(
        page.getByText("Explore ran into a problem")
      ).not.toBeVisible();
      pass += 1;
    }
    expect(pass).toBe(20);
  });

  test("live schedule smoke accepts populated or valid empty UX", async ({
    page,
  }) => {
    await gotoExplore(page, "/explore?feedTab=tv");
    await expect(page.getByTestId("explore-subtab-tv")).toHaveClass(
      /bg-white/,
      {
        timeout: 15_000,
      }
    );
    const watch = page.getByTestId("explore-tv-watch");
    const empty = page.getByText(
      /no programmes|nothing scheduled|no schedule/i
    );
    await expect(watch.or(empty).first()).toBeVisible({ timeout: 30_000 });
  });
});
