/**
 * One-off: reproduce browser schedule fetch from Playwright (same origin as Scenario A).
 */
import { chromium } from "playwright";

const PAGE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:8000/api/v1";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const network = [];
page.on("request", req => {
  if (req.url().includes("/tv/schedule")) {
    network.push({
      phase: "request",
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
    });
  }
});
page.on("requestfailed", req => {
  if (req.url().includes("/tv/schedule")) {
    network.push({
      phase: "failed",
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText ?? "unknown",
    });
  }
});
page.on("response", async res => {
  if (res.url().includes("/tv/schedule")) {
    const h = res.headers();
    network.push({
      phase: "response",
      url: res.url(),
      status: res.status(),
      acao: h["access-control-allow-origin"],
      acac: h["access-control-allow-credentials"],
    });
  }
});

const consoleErrors = [];
page.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", err => consoleErrors.push(String(err)));

await page.goto(`${PAGE.replace(/\/$/, "")}/tv?tvDebug=1`, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(20_000);

const inPageFetch = await page.evaluate(async base => {
  try {
    const res = await fetch(`${base}/tv/schedule`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    return {
      ok: res.ok,
      status: res.status,
      acao: res.headers.get("access-control-allow-origin"),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}, API_BASE);

console.info(
  JSON.stringify(
    { PAGE, API_BASE, inPageFetch, network, consoleErrors },
    null,
    2
  )
);
await browser.close();
