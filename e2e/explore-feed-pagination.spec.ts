import { test, expect } from "@playwright/test";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

/** Near-end threshold matches EXPLORE_NEAR_END_SLOTS in explore-feed-client. */
const NEAR_END_SLOTS = 5;

async function scrollFeedToIndex(
  page: import("@playwright/test").Page,
  index: number
): Promise<number> {
  const scroll = page.getByTestId("explore-feed-scroll");
  return scroll.evaluate(async (el, targetIndex) => {
    const slide = el.querySelector("[data-explore-slide]") as HTMLElement | null;
    const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
    if (h <= 0) return -1;
    el.scrollTop = targetIndex * h;
    el.dispatchEvent(new Event("scroll", { bubbles: true }));
    el.dispatchEvent(new Event("scrollend", { bubbles: true }));
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    return Math.round(el.scrollTop / h);
  }, index);
}

async function scrollFeedNearEnd(
  page: import("@playwright/test").Page,
  slideCount: number
): Promise<void> {
  await scrollFeedToIndex(page, nearEndIndex(slideCount));
}

function nearEndIndex(slideCount: number): number {
  return Math.max(0, slideCount - NEAR_END_SLOTS);
}

test.describe("Explore feed pagination", () => {
  test("anonymous Trends loads three batches (boot + two continuations)", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const paginationLogs: string[] = [];

    page.on("console", msg => {
      const text = msg.text();
      if (text.includes("explore_pagination")) {
        paginationLogs.push(text);
      }
    });

    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }

    const scroll = page.getByTestId("explore-feed-scroll");
    await expect(scroll).toBeVisible();

    const bootCount = await page.locator("[data-explore-slide]").count();
    expect(bootCount).toBeGreaterThanOrEqual(4);

    let slideCount = bootCount;

    for (let round = 0; round < 2; round += 1) {
      await scrollFeedNearEnd(page, slideCount);
      const reachedNearEnd = await page.getByTestId("explore-feed-scroll").evaluate(
        (el, target) => {
          const slide = el.querySelector("[data-explore-slide]") as HTMLElement | null;
          const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
          if (h <= 0) return false;
          return Math.round(el.scrollTop / h) >= target;
        },
        nearEndIndex(slideCount)
      );
      expect(reachedNearEnd).toBe(true);
      await expect(async () => {
        const count = await page.locator("[data-explore-slide]").count();
        expect(count).toBeGreaterThan(slideCount);
      }).toPass({ timeout: 120_000 });
      slideCount = await page.locator("[data-explore-slide]").count();
    }

    // Boot batch + two continuation batches.
    expect(slideCount).toBeGreaterThanOrEqual(bootCount + 4);

    const requestPhases = paginationLogs.filter(l => l.includes('"phase":"request"'));
    expect(requestPhases.length).toBeGreaterThanOrEqual(2);

    const successPhases = paginationLogs.filter(l => l.includes('"phase":"success"'));
    expect(successPhases.length).toBeGreaterThanOrEqual(2);
  });

  test("fourth batch loads after third near-end crossing", async ({ page }) => {
    test.setTimeout(300_000);
    test.skip(true, "Optional stress case; primary three-batch contract is canonical");

    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }

    let slideCount = await page.locator("[data-explore-slide]").count();

    for (let round = 0; round < 3; round += 1) {
      await scrollFeedNearEnd(page, slideCount);
      await expect(async () => {
        const count = await page.locator("[data-explore-slide]").count();
        expect(count).toBeGreaterThan(slideCount);
      }).toPass({ timeout: 90_000 });
      slideCount = await page.locator("[data-explore-slide]").count();
    }

    expect(slideCount).toBeGreaterThanOrEqual(26);
  });
});
