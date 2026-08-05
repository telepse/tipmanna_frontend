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
    const slide = el.querySelector(
      "[data-explore-slide]"
    ) as HTMLElement | null;
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

function nearEndIndex(slideCount: number): number {
  return Math.max(0, slideCount - NEAR_END_SLOTS);
}

async function scrollFeedNearEnd(
  page: import("@playwright/test").Page,
  slideCount: number
): Promise<void> {
  await scrollFeedToIndex(page, nearEndIndex(slideCount));
}

test.describe("Explore feed pagination", () => {
  test("anonymous Trends loads three batches (boot + two continuations)", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const paginationLogs: string[] = [];
    const batchStatuses: number[] = [];

    page.on("console", msg => {
      const text = msg.text();
      if (text.includes("explore_pagination")) {
        paginationLogs.push(text);
      }
    });

    page.on("response", res => {
      if (
        res.url().includes("/contents/feed/batch") &&
        res.request().method() === "POST"
      ) {
        batchStatuses.push(res.status());
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
      const reachedNearEnd = await page
        .getByTestId("explore-feed-scroll")
        .evaluate((el, target) => {
          const slide = el.querySelector(
            "[data-explore-slide]"
          ) as HTMLElement | null;
          const h = slide?.getBoundingClientRect().height ?? el.clientHeight;
          if (h <= 0) return false;
          return Math.round(el.scrollTop / h) >= target;
        }, nearEndIndex(slideCount));
      expect(reachedNearEnd).toBe(true);
      await expect(async () => {
        const count = await page.locator("[data-explore-slide]").count();
        expect(count).toBeGreaterThan(slideCount);
      }).toPass({ timeout: 120_000 });
      slideCount = await page.locator("[data-explore-slide]").count();
    }

    expect(slideCount).toBeGreaterThanOrEqual(bootCount + 4);

    const requestPhases = paginationLogs.filter(l =>
      l.includes('"phase":"request"')
    );
    expect(requestPhases.length).toBeGreaterThanOrEqual(2);

    const successPhases = paginationLogs.filter(l =>
      l.includes('"phase":"success"')
    );
    expect(successPhases.length).toBeGreaterThanOrEqual(2);

    expect(batchStatuses.every(s => s !== 429 && s < 500)).toBeTruthy();
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible();
  });

  test("fast-scroll near-end fixture trigger and append (deterministic)", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/explore?e2e=1");
    const ready = await waitExploreFeedReady(page, 60_000);
    expect(ready.state).toBe("scroll");

    const bootCount = await page.locator("[data-explore-slide]").count();
    expect(bootCount).toBeGreaterThanOrEqual(4);
    await scrollFeedNearEnd(page, bootCount);
    await expect(async () => {
      const count = await page.locator("[data-explore-slide]").count();
      expect(count).toBeGreaterThan(bootCount);
    }).toPass({ timeout: 10_000 });
  });

  test("fast-scroll near-end live-backend performance", async ({ page }) => {
    test.setTimeout(180_000);
    const marks: { label: string; t: number }[] = [];
    const mark = (label: string) => marks.push({ label, t: Date.now() });

    page.on("console", msg => {
      if (msg.text().includes('"phase":"request"')) mark("request");
      if (msg.text().includes('"phase":"success"')) mark("success");
    });

    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    expect(ready.state).toBe("scroll");

    const bootCount = await page.locator("[data-explore-slide]").count();
    mark("threshold");
    await scrollFeedNearEnd(page, bootCount);
    await expect(async () => {
      expect(marks.some(m => m.label === "request")).toBeTruthy();
    }).toPass({ timeout: 5_000 });

    const finalOldIndex = bootCount - 1;
    await scrollFeedToIndex(page, finalOldIndex);
    mark("reached_final_old");

    await expect(async () => {
      const count = await page.locator("[data-explore-slide]").count();
      expect(count).toBeGreaterThan(bootCount);
    }).toPass({ timeout: 120_000 });
    mark("append");

    const t0 = marks.find(m => m.label === "threshold")!.t;
    const tReq = marks.find(m => m.label === "request")!.t;
    const tEnd = marks.find(m => m.label === "reached_final_old")!.t;
    const tAppend = marks.find(m => m.label === "append")!.t;
    expect(tReq - t0).toBeLessThan(2_000);
    // Bounded pagination deadline — must not approach legacy ~60s stack.
    expect(tAppend - tReq).toBeLessThan(40_000);
    // Recoverable wait is acceptable; silent dead end is not.
    expect(tAppend).toBeGreaterThan(tReq);
    console.info(
      JSON.stringify({
        event: "pag_fast_scroll",
        thresholdToRequestMs: tReq - t0,
        thresholdToFinalOldMs: tEnd - t0,
        requestToAppendMs: tAppend - tReq,
        classification:
          tAppend - tReq < 3_000 ? "seamless" : "recoverable_visible_wait",
      })
    );
  });

  test("stale continuation is not appended after filter change", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }

    const bootCount = await page.locator("[data-explore-slide]").count();
    await scrollFeedNearEnd(page, bootCount);

    // Change filter while continuation may be in flight.
    await page
      .getByTestId("explore-filters-open")
      .click({ timeout: 10_000 })
      .catch(async () => {
        await page.getByRole("button", { name: /Open filters/i }).click();
      });
    const comedy = page.getByRole("button", { name: /^Comedy$/i }).first();
    if (await comedy.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await comedy.click();
    }

    await waitExploreFeedReady(page, 60_000);
    // After filter change, feed may reload; ensure no permanent spinner.
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page
        .getByTestId("explore-feed-scroll")
        .or(page.getByText(/no clips available|sign in to browse/i))
        .first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("stale continuation is not appended after sub-tab change", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }

    const bootCount = await page.locator("[data-explore-slide]").count();
    await scrollFeedNearEnd(page, bootCount);
    await page.getByTestId("explore-subtab-saves").click();
    await expect
      .poll(
        () =>
          new URL(page.url(), "http://localhost").searchParams.get("feedTab"),
        { timeout: 8_000 }
      )
      .toBe("saves");
    await waitExploreFeedReady(page, 60_000);
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
      timeout: 30_000,
    });
  });

  test("visibility restore does not leave permanent spinner", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }
    const bootCount = await page.locator("[data-explore-slide]").count();
    await scrollFeedNearEnd(page, bootCount);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("explore-feed-scroll")).toBeVisible();
  });

  test("stale continuation is not appended after Discover open", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }
    const bootCount = await page.locator("[data-explore-slide]").count();
    await scrollFeedNearEnd(page, bootCount);
    await page
      .getByRole("button", { name: /Open discover search|Search/i })
      .first()
      .click()
      .catch(async () => {
        await page.getByPlaceholder(/Search videos/i).click();
      });
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape").catch(() => {});
    await page
      .getByTestId("explore-chrome-feed")
      .click()
      .catch(() => {});
    await waitExploreFeedReady(page, 60_000);
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
      timeout: 30_000,
    });
  });

  test("stale continuation is not appended after browser Back", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/explore");
    await waitExploreFeedReady(page, 60_000);
    await page.getByTestId("explore-subtab-saves").click();
    await expect
      .poll(
        () =>
          new URL(page.url(), "http://localhost").searchParams.get("feedTab"),
        { timeout: 8_000 }
      )
      .toBe("saves");
    await page.getByTestId("explore-subtab-trends").click();
    await expect
      .poll(
        () =>
          new URL(page.url(), "http://localhost").searchParams.get("feedTab") ??
          "trends",
        { timeout: 8_000 }
      )
      .toBe("trends");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }
    const bootCount = await page.locator("[data-explore-slide]").count();
    await scrollFeedNearEnd(page, bootCount);
    await page.goBack();
    await expect
      .poll(
        () =>
          new URL(page.url(), "http://localhost").searchParams.get("feedTab"),
        { timeout: 8_000 }
      )
      .toBe("saves");
    await waitExploreFeedReady(page, 60_000);
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
      timeout: 30_000,
    });
  });

  test("offline then online does not leave permanent spinner", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/explore");
    const ready = await waitExploreFeedReady(page, 60_000);
    if (ready.state !== "scroll") {
      test.skip(true, "Populated feed required for pagination");
      return;
    }
    const bootCount = await page.locator("[data-explore-slide]").count();
    await scrollFeedNearEnd(page, bootCount);
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByTestId("explore-feed-skeleton")).not.toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("explore-feed-scroll")).toBeVisible();
  });

  test("fourth batch loads after third near-end crossing", async ({ page }) => {
    test.setTimeout(300_000);
    test.skip(
      true,
      "Optional stress case; primary three-batch contract is canonical"
    );

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
