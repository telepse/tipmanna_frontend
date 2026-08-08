import { test, expect, chromium } from "@playwright/test";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

const LIVE_BOOT_RUNS = 20;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

type LiveBootResult = {
  run: number;
  state: "scroll" | "empty" | "fail";
  bootMs: number;
  slideCount: number;
  error?: string;
};

test.describe("Feed boot stability (live backend)", () => {
  test("20 fresh contexts reach populated Feed at /explore", async () => {
    test.setTimeout(LIVE_BOOT_RUNS * 120_000);
    const results: LiveBootResult[] = [];

    for (let run = 1; run <= LIVE_BOOT_RUNS; run++) {
      const browser = await chromium.launch({
        channel: process.env.PLAYWRIGHT_CHANNEL,
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      const started = Date.now();
      let state: LiveBootResult["state"] = "fail";
      let slideCount = 0;
      let error: string | undefined;

      try {
        await page.goto(`${baseURL}/explore`, {
          waitUntil: "commit",
          timeout: 60_000,
        });
        const readiness = await waitExploreFeedReady(page, 90_000);
        state = readiness.state;
        slideCount = await page.locator("[data-explore-slide]").count();
        expect(state).toBe("scroll");
        expect(slideCount).toBeGreaterThanOrEqual(4);
        await expect(
          page.getByTestId("explore-feed-skeleton")
        ).not.toBeVisible();
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        state = "fail";
      }

      results.push({
        run,
        state,
        bootMs: Date.now() - started,
        slideCount,
        error,
      });
      await context.close();
      await browser.close();
    }

    const failed = results.filter(r => r.state !== "scroll");
    console.info(
      "[feed-boot-live-stability] SUMMARY",
      JSON.stringify({
        pass: results.length - failed.length,
        fail: failed.length,
        empty: results.filter(r => r.state === "empty").length,
        failures: failed,
      })
    );
    expect(failed).toEqual([]);
  });
});
