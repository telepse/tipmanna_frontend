import { test, expect, chromium } from "@playwright/test";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

const BOOT_RUNS = 20;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Feed boot stability (backend path proof)", () => {
  test("20 fresh contexts reach Feed readiness", async () => {
    test.setTimeout(BOOT_RUNS * 120_000);

    const results: Array<{
      run: number;
      state: "scroll" | "empty" | "fail";
      bootMs: number;
      error?: string;
    }> = [];

    for (let run = 1; run <= BOOT_RUNS; run++) {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      const rscAborts: string[] = [];
      page.on("requestfailed", req => {
        const u = req.url();
        if (u.includes("/explore") && req.method() === "POST") {
          rscAborts.push(req.failure()?.errorText ?? "unknown");
        }
      });

      const started = Date.now();
      let state: "scroll" | "empty" | "fail" = "fail";
      let error: string | undefined;

      try {
        await page.goto(`${baseURL}/explore`, {
          waitUntil: "domcontentloaded",
        });
        const readiness = await waitExploreFeedReady(page, 90_000);
        state = readiness.state;
        const skeletonVisible = await page
          .getByTestId("explore-feed-skeleton")
          .isVisible()
          .catch(() => false);
        expect(skeletonVisible).toBe(false);
        if (rscAborts.length > 0) {
          throw new Error(`aborted RSC: ${rscAborts.join("; ")}`);
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        state = "fail";
      }

      results.push({
        run,
        state,
        bootMs: Date.now() - started,
        error,
      });

      await context.close();
      await browser.close();
    }

    const ok = results.filter(r => r.state !== "fail");
    const bootMs = ok.map(r => r.bootMs).sort((a, b) => a - b);
    const median =
      bootMs.length === 0
        ? 0
        : bootMs.length % 2 === 0
          ? Math.round(
              (bootMs[bootMs.length / 2 - 1] + bootMs[bootMs.length / 2]) / 2
            )
          : bootMs[Math.floor(bootMs.length / 2)];

    console.info(
      "[feed-boot-stability-proof] SUMMARY",
      JSON.stringify({
        pass: ok.length,
        fail: results.length - ok.length,
        minMs: bootMs[0] ?? null,
        medianMs: median,
        maxMs: bootMs[bootMs.length - 1] ?? null,
        failures: results.filter(r => r.state === "fail"),
      })
    );

    expect(results.filter(r => r.state === "fail")).toEqual([]);
  });
});
