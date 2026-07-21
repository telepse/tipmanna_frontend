import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

type RscEvent = {
  url: string;
  method: string;
  status?: number;
  failed?: boolean;
  error?: string;
};

type RunResult = {
  run: number;
  pass: boolean;
  firstDivergence?: string;
  finalUrl: string;
  tabParam: string | null;
  uiMyCommunities: boolean;
  proofLogs: string[];
  rscEvents: RscEvent[];
  backForwardOk: boolean;
};

function attachProofListeners(
  page: Page,
  proofLogs: string[],
  rscEvents: RscEvent[]
) {
  page.on("console", msg => {
    const text = msg.text();
    if (text.includes("[single-path-proof]")) {
      proofLogs.push(text);
    }
  });

  page.on("request", req => {
    const url = req.url();
    if (req.method() === "POST" && url.includes("/explore")) {
      rscEvents.push({ url, method: "POST" });
    }
  });

  page.on("response", res => {
    const url = res.url();
    if (res.request().method() === "POST" && url.includes("/explore")) {
      const match = rscEvents.findLast(
        e => e.url === url && e.status === undefined
      );
      if (match) match.status = res.status();
    }
  });

  page.on("requestfailed", req => {
    const url = req.url();
    if (req.method() === "POST" && url.includes("/explore")) {
      rscEvents.push({
        url,
        method: "POST",
        failed: true,
        error: req.failure()?.errorText,
      });
    }
  });
}

async function runSinglePath(
  context: BrowserContext,
  runIndex: number
): Promise<RunResult> {
  const page = await context.newPage();
  const proofLogs: string[] = [];
  const rscEvents: RscEvent[] = [];
  attachProofListeners(page, proofLogs, rscEvents);

  let firstDivergence: string | undefined;
  let pass = false;
  let backForwardOk = false;

  try {
    await page.goto(`${BASE}/explore`, { waitUntil: "domcontentloaded" });

    const feedState = await waitExploreFeedReady(page, 90_000);
    if (feedState !== "scroll") {
      firstDivergence = "feed-not-ready";
      throw new Error("Feed scroll not available");
    }

    await page.waitForTimeout(2000);

    const preClickUrl = page.url();
    await page.getByTestId("explore-chrome-start-community").click();
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    const tabParam = new URL(finalUrl).searchParams.get("tab");
    const uiMyCommunities = await page
      .getByRole("heading", { name: "Communities" })
      .isVisible()
      .catch(() => false);

    if (tabParam !== "my-communities") {
      firstDivergence = classifyFailure(
        proofLogs,
        rscEvents,
        tabParam,
        uiMyCommunities
      );
    } else if (!uiMyCommunities) {
      firstDivergence = "ui-not-my-communities";
    } else {
      await page.goBack();
      await page.waitForTimeout(500);
      const backUrl = page.url();
      const backTab = new URL(backUrl).searchParams.get("tab");
      await page.goForward();
      await page.waitForTimeout(500);
      const fwdUrl = page.url();
      const fwdTab = new URL(fwdUrl).searchParams.get("tab");
      backForwardOk =
        backTab !== "my-communities" && fwdTab === "my-communities";
      if (!backForwardOk) {
        firstDivergence = "back-forward-failed";
      } else {
        pass = true;
      }
    }

    return {
      run: runIndex,
      pass,
      firstDivergence,
      finalUrl,
      tabParam,
      uiMyCommunities,
      proofLogs,
      rscEvents,
      backForwardOk,
    };
  } catch (e) {
    return {
      run: runIndex,
      pass: false,
      firstDivergence:
        firstDivergence ?? (e instanceof Error ? e.message : String(e)),
      finalUrl: page.url(),
      tabParam: new URL(page.url()).searchParams.get("tab"),
      uiMyCommunities: false,
      proofLogs,
      rscEvents,
      backForwardOk: false,
    };
  } finally {
    await page.close();
  }
}

function classifyFailure(
  proofLogs: string[],
  rscEvents: RscEvent[],
  tabParam: string | null,
  uiMyCommunities: boolean
): string {
  const failedRsc = rscEvents.find(
    e => e.failed || (e.status && e.status >= 400)
  );
  if (failedRsc) {
    return failedRsc.failed
      ? `router-push-rsc-aborted:${failedRsc.error ?? "unknown"}`
      : `rsc-http-${failedRsc.status}`;
  }

  const clickLog = proofLogs.find(l => l.includes("click-my-communities"));
  if (!clickLog) return "click-handler-did-not-run";

  const pushLog = proofLogs.find(l => l.includes("router.push"));
  if (!pushLog) {
    const equalGuard = proofLogs.find(
      l => l.includes("commitExploreUrl") && l.includes("hrefsEqual")
    );
    if (equalGuard?.includes("true")) return "equality-guard-suppressed-push";
    return "router-push-not-called";
  }

  if (uiMyCommunities && tabParam !== "my-communities") {
    const passive = proofLogs.some(
      l => l.includes("router.replace") && l.includes("passive-sync")
    );
    if (passive) return "passive-replace-overwrote-url";
    const mount = proofLogs.some(l => l.includes("mount-canonical-replace"));
    if (mount) return "mount-canonical-replace-race";
    const restore = proofLogs.some(l => l.includes("url-restore-apply"));
    if (restore) return "url-restore-overwrote-state";
    return "browser-url-never-committed";
  }

  return "tab-param-missing";
}

test.describe("single-path My Communities proof", () => {
  test("Feed → My Communities ×10 fresh contexts", async ({ browser }) => {
    test.setTimeout(20 * 60_000);

    const results: RunResult[] = [];
    for (let i = 1; i <= 10; i++) {
      const context = await browser.newContext();
      results.push(await runSinglePath(context, i));
      await context.close();
    }

    console.info(
      "[single-path-proof] SUMMARY",
      JSON.stringify(
        results.map(r => ({
          run: r.run,
          pass: r.pass,
          firstDivergence: r.firstDivergence,
          finalUrl: r.finalUrl,
          tabParam: r.tabParam,
          uiMyCommunities: r.uiMyCommunities,
          rscFailed: r.rscEvents.filter(e => e.failed).length,
          backForwardOk: r.backForwardOk,
        })),
        null,
        2
      )
    );

    const passCount = results.filter(r => r.pass).length;
    expect(passCount, `Expected 10/10, got ${passCount}/10`).toBe(10);
  });
});
