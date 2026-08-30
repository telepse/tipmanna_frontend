#!/usr/bin/env node
/** Browser verification of Explore E2E dual-gate — no secrets. */
import { chromium } from "@playwright/test";

const base = process.argv[2];
if (!base) {
  console.error(
    "Usage: node scripts/verify-fixture-gates.mjs <deployment-url>"
  );
  process.exit(1);
}
const origin = base.replace(/\/$/, "");

async function probe(path) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${origin}${path}`, {
    waitUntil: "commit",
    timeout: 60_000,
  });
  await page
    .locator("[data-explore-e2e-fixtures]")
    .first()
    .waitFor({ state: "attached", timeout: 45_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2_000);
  const state = await page.evaluate(() => {
    const root = document.querySelector("[data-explore-e2e-fixtures]");
    return {
      runtimeFixtures: root?.getAttribute("data-explore-e2e-fixtures") ?? null,
      buildFlag: root?.getAttribute("data-explore-e2e-fixtures-build") ?? null,
      deployCommit: root?.getAttribute("data-explore-deploy-commit") ?? null,
      hasE2eDiscoverClip:
        !!document.body?.textContent?.includes("E2E Discover clip"),
      hasE2eCommunity: !!document.body?.textContent?.includes("E2E Community"),
      hasE2eFeedClip:
        !!document.body?.textContent?.includes("E2E Explore clip"),
    };
  });
  await browser.close();
  return { path, ...state };
}

const off = await probe("/explore");
const on = await probe("/explore?e2e=1");
console.info(JSON.stringify({ off, on }, null, 2));
