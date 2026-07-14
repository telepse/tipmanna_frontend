import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";

test.describe("explore TV session continuity", () => {
  test("feed stays mounted while TV sub-tab is active", async ({ page }) => {
    await gotoExplore(page);
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "TV" }).click();
    await expect(page.getByTestId("explore-feed-shell")).toBeAttached();
    await expect(page.getByTestId("explore-feed-scroll")).toBeAttached();
    await expect(page.getByTestId("explore-feed-shell")).toHaveClass(/hidden/);
    await expect(page.getByTestId("explore-feed-scroll")).not.toBeVisible();
  });

  test("scroll position preserved across TV and Trends", async ({ page }) => {
    await gotoExplore(page);
    const scroll = page.getByTestId("explore-feed-scroll");
    if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, "Feed scroll not available");
      return;
    }

    const slideCount = await page.locator("[data-explore-slide]").count();
    if (slideCount < 2) {
      test.skip(true, "Need at least 2 slides to test scroll preserve");
      return;
    }

    await scroll.evaluate(async el => {
      const slide = el.querySelector(
        "[data-explore-slide]"
      ) as HTMLElement | null;
      const h = slide?.getBoundingClientRect().height ?? 0;
      el.scrollTop = h;
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });

    const indexBefore = await scroll.evaluate(el => {
      const slide = el.querySelector(
        "[data-explore-slide]"
      ) as HTMLElement | null;
      const h = slide?.getBoundingClientRect().height ?? 1;
      return Math.round(el.scrollTop / h);
    });

    await page.getByRole("button", { name: "TV" }).click();
    await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
      /bg-white/,
      { timeout: 10_000 }
    );
    await page.getByRole("button", { name: "Trends" }).click();
    await expect(scroll).toBeVisible({ timeout: 15_000 });

    const indexAfter = await scroll.evaluate(el => {
      const slide = el.querySelector(
        "[data-explore-slide]"
      ) as HTMLElement | null;
      const h = slide?.getBoundingClientRect().height ?? 1;
      return Math.round(el.scrollTop / h);
    });

    expect(indexAfter).toBe(indexBefore);
  });

  test("TV programme handoff opens reel without remount hang", async ({
    page,
  }) => {
    await gotoExplore(page, "/explore?feedTab=tv&e2eTv=1");
    await expect(page.getByRole("button", { name: "TV" })).toHaveClass(
      /bg-white/,
      { timeout: 15_000 }
    );

    const watch = page.getByTestId("explore-tv-watch").first();
    await expect(watch).toBeVisible({ timeout: 15_000 });
    await watch.click();

    await expect(page.getByRole("button", { name: "Trends" })).toHaveClass(
      /bg-white/,
      { timeout: 15_000 }
    );
    await expect(page.getByTestId("explore-feed-scroll")).toBeVisible({
      timeout: 45_000,
    });
    await expect(
      page.getByText("Explore ran into a problem")
    ).not.toBeVisible();
    await expect(page.getByTestId("explore-feed-shell")).not.toHaveClass(
      /hidden/
    );
  });

  test("visible reel shell returns after leaving TV tab", async ({ page }) => {
    await gotoExplore(page);
    const scroll = page.getByTestId("explore-feed-scroll");
    if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip(true, "Feed scroll not available");
      return;
    }

    await page.getByRole("button", { name: "TV" }).click();
    await page.getByRole("button", { name: "Trends" }).click();
    await expect(scroll).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("explore-video-shell").first()).toBeVisible();
  });
});
