/**
 * Real-browser Test C capture (LOCAL → drawer dismiss → return).
 * Usage: node scripts/tv-runtime-test-c.mjs
 * Optional: TV_TEST_CHROME_PROFILE=%LOCALAPPDATA%\Google\Chrome\User Data
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const OUT = join(scriptDir, "tv-runtime-test-c-traces.json");
const CHROME_PROFILE = process.env.TV_TEST_CHROME_PROFILE;

const allLines = [];

function pushLine(source, text) {
  const t = String(text).trim();
  if (!t.includes("[TV")) return;
  allLines.push({ at: Date.now(), source, text: t });
}

function parseLoose(text) {
  const blob = text.includes("{") ? text.slice(text.indexOf("{")) : text;
  const mode = blob.match(/\bmode:\s*['"]?(GLOBAL|LOCAL)['"]?/)?.[1];
  const currentIndex = Number(blob.match(/\bcurrentIndex:\s*(\d+)/)?.[1]);
  const reason = blob.match(/\breason:\s*['"]?([\w_]+)['"]?/)?.[1];
  const videoId = blob.match(/\bvideoId:\s*['"]?([\w-]+)['"]?/)?.[1];
  const startSeconds = blob.match(/\bstartSeconds:\s*([\d.]+)/)?.[1];
  return { mode, currentIndex, reason, videoId, startSeconds };
}

function sliceWindow(startAt, endAt) {
  return allLines.filter(l => l.at >= startAt && l.at <= endAt);
}

function countSubstr(lines, s) {
  return lines.filter(l => l.text.includes(s)).length;
}

async function dismissTvPicker(page) {
  const btn = page.getByRole("button", { name: /Tipmanna TV \(global\)/i });
  if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1200);
  }
}

async function openTipDrawerDesktop(page) {
  const enlarge = page.getByRole("button", { name: /^Enlarge$/i });
  if (await enlarge.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enlarge.click({ force: true });
    await page.waitForTimeout(2000);
  }
  const engage = page.locator("button").filter({ hasText: /^Engage$|Engage/i });
  const n = await engage.count();
  for (let i = 0; i < n; i++) {
    const b = engage.nth(i);
    if (await b.isVisible().catch(() => false)) {
      await b.click({ force: true, timeout: 5000 });
      return `engage_button_${i}`;
    }
  }
  const strip = page.getByRole("button", { name: /^Pay$/i }).first();
  if (await strip.isVisible({ timeout: 3000 }).catch(() => false)) {
    await strip.click({ force: true });
    return "pay_strip";
  }
  return null;
}

const launchOpts = {
  headless: false,
  channel: "chrome",
  args: ["--autoplay-policy=no-user-gesture-required"],
};

let browser;
let context;
let page;

if (CHROME_PROFILE) {
  context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    ...launchOpts,
    viewport: { width: 1440, height: 900 },
  });
  page = context.pages()[0] ?? (await context.newPage());
} else {
  browser = await chromium.launch(launchOpts);
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  page = await context.newPage();
}

page.on("console", msg => pushLine("console", msg.text()));

const url = `${BASE.replace(/\/$/, "")}/tv?tvDebug=1`;
console.info(
  "[test-c] Open",
  url,
  CHROME_PROFILE
    ? "(persistent Chrome profile)"
    : "(ephemeral — sign in manually if needed)"
);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
await dismissTvPicker(page);
await page
  .getByRole("button", { name: /^Your TV$/i })
  .waitFor({ timeout: 120_000 });
await page.waitForTimeout(4000);

const preLocalMarker = Date.now();
await page.getByRole("button", { name: /^Your TV$/i }).click();
await page.waitForTimeout(2500);

const scrub = page.locator('input[type="range"]').first();
let scrubValue = null;
if (await scrub.isVisible({ timeout: 5000 }).catch(() => false)) {
  scrubValue = await scrub.evaluate(el => {
    const max = Number(el.max) || 600;
    const v = Math.round(max * 0.22);
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return v;
  });
  await page.waitForTimeout(3000);
}

const preCloseMarker = Date.now();
const modeLocalLine = [...allLines]
  .reverse()
  .find(l => l.text.includes("mode_enter_local"));
const preSnapshot = {
  scrubValue,
  modeLocalLine: modeLocalLine?.text ?? null,
  preLocal: parseLoose(modeLocalLine?.text ?? ""),
  lastSync:
    [...allLines].reverse().find(l => l.text.includes("syncToLive"))?.text ??
    null,
  lastRequest:
    [...allLines].reverse().find(l => l.text.includes("requestPlayback"))
      ?.text ?? null,
};

const openMethod = await openTipDrawerDesktop(page);
if (!openMethod) {
  const report = {
    status: "blocked",
    blocker:
      "Could not open tip drawer (Engage/Pay). Sign-in or tip catalog may be required.",
    preSnapshot,
    authHint:
      "Set TV_TEST_CHROME_PROFILE to your Chrome User Data path (Chrome fully quit) for signed-in session.",
  };
  writeFileSync(OUT, JSON.stringify({ report, allLines }, null, 2));
  console.info(JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  else await context.close();
  process.exit(0);
}

await page.waitForTimeout(4000);
const closeStart = Date.now();
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
const dialogClose = page.locator('[role="dialog"] button').first();
if (
  await page
    .locator('[role="dialog"]')
    .isVisible({ timeout: 2000 })
    .catch(() => false)
) {
  await dialogClose.click({ force: true }).catch(() => {});
}
await page.waitForTimeout(18_000);

const windowEnd = Date.now();
const windowLines = sliceWindow(preCloseMarker - 5000, windowEnd);
const returnLines = sliceWindow(closeStart - 5000, windowEnd);

const paymentRestoreLines = returnLines.filter(
  l =>
    l.text.includes("payment_restore") ||
    (l.text.includes("requestPlayback") && l.text.includes("payment_restore"))
);
const requestPlaybackAll = returnLines.filter(l =>
  l.text.includes("[TV:playback] requestPlayback")
);

const report = {
  status: "executed",
  url,
  chromeProfile: CHROME_PROFILE ? "yes" : "no",
  openMethod,
  preSnapshot,
  scrubTargetSeconds: scrubValue,
  invariantChecks: {
    no_mode_enter_global: countSubstr(returnLines, "mode_enter_global") === 0,
    mode_enter_global_count: countSubstr(returnLines, "mode_enter_global"),
    payment_restore_request_count: countSubstr(returnLines, "payment_restore"),
    requestPlayback_count: requestPlaybackAll.length,
    syncToLive_drift_seek_raw:
      countSubstr(returnLines, "syncToLive_drift_seek") -
      countSubstr(returnLines, "syncToLive_drift_seek_suppressed") -
      countSubstr(returnLines, "syncToLive_drift_seek_deduped"),
    player_not_ready_defer_hints: returnLines
      .filter(
        l =>
          l.text.includes("syncToLive_player_not_ready") ||
          l.text.includes("requestPlayback_deferred") ||
          l.text.includes("readiness_flush")
      )
      .map(l => l.text),
  },
  returnWindowTrace: returnLines.map(l => l.text),
  fullWindowTrace: windowLines.map(l => l.text),
};

writeFileSync(OUT, JSON.stringify({ report, allLines }, null, 2));
console.info("[test-c] wrote", OUT);
console.info(JSON.stringify(report.invariantChecks, null, 2));
console.info("--- return window ---");
for (const line of report.returnWindowTrace) console.info(line);

if (browser) await browser.close();
else await context.close();
