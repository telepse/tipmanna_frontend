/**
 * One-off runtime capture for Phase 4 scenario A (GLOBAL long-play).
 * Usage: node scripts/tv-runtime-scenario-a.mjs [durationSeconds]
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const DURATION_MS =
  (Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 180) * 1000;
const OUT = join(scriptDir, "tv-runtime-scenario-a-traces.json");

const playbackLines = [];
const allTvLines = [];

function pushLine(source, text) {
  const t = text.trim();
  if (!t.includes("[TV:")) return;
  allTvLines.push({ at: Date.now(), source, text: t });
  if (t.includes("[TV:playback]")) {
    playbackLines.push({ at: Date.now(), text: t });
  }
}

const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

page.on("console", msg => pushLine("console", msg.text()));
page.on("pageerror", err => pushLine("pageerror", String(err)));

const url = `${BASE.replace(/\/$/, "")}/tv?tvDebug=1`;
console.info(`[scenario-a] navigating ${url}`);
const resp = await page.goto(url, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
console.info(`[scenario-a] HTTP ${resp?.status() ?? "?"}`);

await page.waitForTimeout(15_000);
console.info(`[scenario-a] collecting traces for ${DURATION_MS / 1000}s…`);
const started = Date.now();
while (Date.now() - started < DURATION_MS) {
  await page.waitForTimeout(5000);
}

const summary = {
  url,
  durationSec: DURATION_MS / 1000,
  httpStatus: resp?.status() ?? null,
  playbackEventCount: playbackLines.length,
  driftSeek: playbackLines.filter(l => l.text.includes("syncToLive_drift_seek"))
    .length,
  driftSeekSuppressed: playbackLines.filter(l =>
    l.text.includes("syncToLive_drift_seek_suppressed")
  ).length,
  driftSeekDeduped: playbackLines.filter(l =>
    l.text.includes("syncToLive_drift_seek_deduped")
  ).length,
  coalescedSeek: playbackLines.filter(l =>
    l.text.includes("syncToLive_coalesced_seek")
  ).length,
  driftSeekActualZero: playbackLines.filter(l => {
    if (!l.text.includes("syncToLive_drift_seek")) return false;
    if (l.text.includes("suppressed") || l.text.includes("deduped"))
      return false;
    return /actual['":\s]+0\b/.test(l.text) || /"actual":0/.test(l.text);
  }).length,
  orchestratedCommands: playbackLines.filter(l =>
    l.text.includes("orchestrated_playback_command_issued")
  ).length,
  onStateChange: playbackLines.filter(l => l.text.includes("onStateChange"))
    .length,
  buffering: playbackLines.filter(l =>
    /BUFFERING|stateName.*BUFFERING|"state":3/.test(l.text)
  ).length,
  playing: playbackLines.filter(l =>
    /PLAYING|stateName.*PLAYING|"state":1/.test(l.text)
  ).length,
  playbackUrlChange: playbackLines.filter(l =>
    l.text.includes("playbackUrl_change")
  ).length,
  playerResumeRemount: playbackLines.filter(l =>
    l.text.includes("player_resume_remount")
  ).length,
  samplePlayback: playbackLines.slice(0, 40).map(l => l.text),
  samplePlaybackTail: playbackLines.slice(-30).map(l => l.text),
};

writeFileSync(
  OUT,
  JSON.stringify({ summary, playbackLines, allTvLines }, null, 2)
);
console.info("[scenario-a] summary:", JSON.stringify(summary, null, 2));
await browser.close();
