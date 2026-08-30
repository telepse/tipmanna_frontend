import { test, expect, chromium } from "@playwright/test";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";
import { withE2eFixtures } from "./helpers/explore-test-fixtures";
import {
  hasUnexplainedExploreRscFailure,
  trackExploreRscRequests,
  type ExploreRscRequestRecord,
} from "./helpers/explore-rsc-request-tracker";

const FRESH_CONTEXT_RUNS = 20;
const PERSISTENT_REFRESH_RUNS = 10;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

type BootRunResult = {
  run: number;
  kind: "fresh" | "refresh";
  state: "scroll" | "empty" | "fail";
  bootMs: number;
  rscRecords: ExploreRscRequestRecord[];
  error?: string;
};

async function bootOnce(
  page: import("@playwright/test").Page,
  run: number,
  kind: "fresh" | "refresh"
): Promise<BootRunResult> {
  const rscRecords = trackExploreRscRequests(page);
  const started = Date.now();
  let state: "scroll" | "empty" | "fail" = "fail";
  let error: string | undefined;

  try {
    if (kind === "refresh") {
      await page.reload({ waitUntil: "commit", timeout: 60_000 });
    } else {
      await page.goto(`${baseURL}${withE2eFixtures("/explore")}`, {
        waitUntil: "commit",
        timeout: 60_000,
      });
    }

    const readiness = await waitExploreFeedReady(page, 90_000);
    state = readiness.state;

    const skeletonVisible = await page
      .getByTestId("explore-feed-skeleton")
      .isVisible()
      .catch(() => false);
    expect(skeletonVisible).toBe(false);

    const fatalVisible = await page
      .getByText(/Explore ran into a problem/i)
      .isVisible()
      .catch(() => false);
    expect(fatalVisible).toBe(false);

    const feedReady = state === "scroll" || state === "empty";
    const rscCheck = hasUnexplainedExploreRscFailure(rscRecords, feedReady);
    if (rscCheck.unexplained) {
      throw new Error(rscCheck.reason ?? "unexplained RSC failure");
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    state = "fail";
  }

  return {
    run,
    kind,
    state,
    bootMs: Date.now() - started,
    rscRecords: [...rscRecords],
    error,
  };
}

function summarize(results: BootRunResult[]) {
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
      rscAbortsAccepted: results.flatMap(r =>
        r.rscRecords.filter(rec => rec.outcome === "aborted")
      ).length,
    })
  );
}

test.describe("Feed boot stability (backend path proof)", () => {
  test("20 fresh contexts reach Feed readiness", async () => {
    test.setTimeout(FRESH_CONTEXT_RUNS * 120_000);
    const results: BootRunResult[] = [];

    for (let run = 1; run <= FRESH_CONTEXT_RUNS; run++) {
      const browser = await chromium.launch({
        channel: process.env.PLAYWRIGHT_CHANNEL,
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      results.push(await bootOnce(page, run, "fresh"));
      await context.close();
      await browser.close();
    }

    summarize(results);
    expect(results.filter(r => r.state === "fail")).toEqual([]);
  });

  test("10 persistent refreshes reach Feed readiness", async () => {
    test.setTimeout(PERSISTENT_REFRESH_RUNS * 120_000);
    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL,
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    const results: BootRunResult[] = [];

    results.push(await bootOnce(page, 1, "fresh"));
    for (let run = 2; run <= PERSISTENT_REFRESH_RUNS; run++) {
      results.push(await bootOnce(page, run, "refresh"));
    }

    await context.close();
    await browser.close();

    summarize(results);
    expect(results.filter(r => r.state === "fail")).toEqual([]);
  });
});
