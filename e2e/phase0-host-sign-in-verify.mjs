/**
 * Disposable Phase 0 — real Host sign-in form (no cookie injection).
 * Reads credentials from FE restore seed JSON; never prints the password.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base =
  process.env.PHASE0_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:3014";
const seedPath =
  process.env.STREAMING_B1_E2E_SEED_PATH?.trim() ??
  process.env.STREAMING_B1_E2E_SEED_OUT?.trim() ??
  new URL(
    "../../frontend-wt-b1-finish-b-restore/.streaming-b1-e2e.json",
    import.meta.url
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const email = seed.hostUser?.email ?? `${seed.hostSlug}@example.test`;
const password = seed.hostPassword;
if (!password || String(password).length < 8) {
  throw new Error("seed hostPassword missing or shorter than 8");
}
const broadcastPath = `/host/${seed.hostSlug}/broadcast/${seed.eventId}`;
const useNgrok = base.includes("ngrok");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  useNgrok ? { extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" } } : {}
);
const page = await context.newPage();

page.on("pageerror", err => console.error("pageerror", err.message));
await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded" });
try {
  await page
    .locator('input[type="password"]')
    .first()
    .waitFor({ state: "visible", timeout: 90_000 });
} catch (err) {
  await page.screenshot({ path: "phase0-sign-in-debug.png", fullPage: true });
  throw err;
}

for (const selector of [
  page.getByRole("tab", { name: /^host$/i }),
  page.getByRole("button", { name: /^host$/i }),
  page.getByText(/^host$/i),
]) {
  if (await selector.first().isVisible().catch(() => false)) {
    await selector.first().click();
    break;
  }
}

const emailInput = page
  .getByPlaceholder(/email address or username/i)
  .or(page.locator('input[autocomplete="off"]').first());
const passwordInput = page.locator('input[type="password"]').first();

await emailInput.fill(email);
await passwordInput.fill("test");
await page.getByRole("button", { name: /^sign in$/i }).click();
await page
  .getByText(/password is required|at least 6 characters/i)
  .first()
  .waitFor({ state: "visible", timeout: 10_000 });

await passwordInput.fill(password);
await page.getByRole("button", { name: /^sign in$/i }).click();
await page.waitForURL(u => !u.pathname.includes("sign-in"), { timeout: 90_000 });

await page.goto(`${base}${broadcastPath}`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: /Advanced Studio/i }).waitFor({
  timeout: 120_000,
});
const prep = (await page.locator('dt:has-text("Prep") + dd').textContent())?.trim();
const rate = (await page.locator('dt:has-text("Rate") + dd').textContent())?.trim();
if (prep !== "none" || rate !== "standard") {
  throw new Error(`fixture state prep=${prep} rate=${rate}`);
}

console.log(
  JSON.stringify({
    ok: true,
    base,
    hostSlug: seed.hostSlug,
    eventId: seed.eventId,
    url: page.url(),
    prep,
    rate,
    formLogin: true,
    cookieInjection: false,
  })
);

await browser.close();
