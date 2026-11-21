/**
 * LIVE-016 production-mode: host sign-in (server action) + broadcast branding preview.
 * Does not log passwords. Requires Playwright chromium.
 *
 * Asserts authenticated outcomes (URL, protected UI, saved branding) — not browser fetch to login-host.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.LIVE016_FE_BASE?.replace(/\/$/, "") ?? "http://127.0.0.1:3016";
const credPath =
  process.env.FINISH_B_DISPOSABLE_CREDENTIALS?.trim() ??
  "C:/Users/Elite/Documents/Tipmanna/TIPMANNA - LOCAL/.finish-b-disposable-admin.local.json";
const cred = JSON.parse(readFileSync(credPath, "utf8"));
const email = cred.hostLoginEmail ?? cred.testHostEmail;
const password = cred.hostLoginPassword ?? process.env.STREAMING_B1_E2E_HOST_PASSWORD;
if (!email || !password) {
  console.error(JSON.stringify({ ok: false, error: "hostLoginEmail and hostLoginPassword required" }));
  process.exit(1);
}

const broadcastPath = `/host/${cred.testHostSlug}/broadcast/${cred.testEventId}`;
const broadcastUrl = `${base}${broadcastPath}`;
const gatePattern = /LIVE016 Browser Gate A/i;

function fail(code, payload) {
  console.error(JSON.stringify({ ok: false, ...payload }, null, 2));
  process.exit(code);
}

async function selectHostTab(page) {
  for (const selector of [
    page.getByRole("tab", { name: /^host$/i }),
    page.getByRole("button", { name: /^host$/i }),
  ]) {
    if (await selector.first().isVisible().catch(() => false)) {
      await selector.first().click();
      break;
    }
  }
}

async function hostSignIn(page, emailValue, passwordValue) {
  await page.goto(
    `${base}/sign-in?next=${encodeURIComponent(broadcastPath)}`,
    { waitUntil: "domcontentloaded" }
  );
  await selectHostTab(page);
  await page.getByPlaceholder(/email address or username/i).fill(emailValue);
  await page.locator('input[type="password"]').first().fill(passwordValue);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

async function readBrandingPreview(page) {
  const el = page.getByTestId("stream-branding-preview");
  await el.waitFor({ timeout: 120_000 });
  return (await el.textContent()) ?? "";
}

const debug = await fetch(`${base}/api/dev/backend-path-proof`).then(async r => ({
  status: r.status,
  body: await r.text().then(t => t.slice(0, 120)),
}));

const browser = await chromium.launch({ headless: true });

// --- Negative: unauthenticated broadcast must not show saved branding ---
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(broadcastUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const onSignIn = page.url().includes("/sign-in");
  const previewVisible = await page
    .getByTestId("stream-branding-preview")
    .isVisible()
    .catch(() => false);
  let previewText = "";
  if (previewVisible) {
    previewText = (await page.getByTestId("stream-branding-preview").textContent()) ?? "";
  }
  if (!onSignIn && gatePattern.test(previewText)) {
    await ctx.close();
    fail(10, {
      step: "negative_unauthenticated",
      message: "Saved branding visible without authentication",
      url: page.url(),
    });
  }
  await ctx.close();
}

// --- Negative: wrong password must not reach authenticated broadcast ---
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await hostSignIn(page, email, `${password}-wrong-live016`);
  await page.waitForTimeout(5000);
  const stillSignIn = page.url().includes("/sign-in");
  await page.goto(broadcastUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const previewText = (await page
    .getByTestId("stream-branding-preview")
    .textContent()
    .catch(() => "")) ?? "";
  const advancedVisible = await page
    .getByRole("heading", { name: /Advanced Studio/i })
    .isVisible()
    .catch(() => false);
  if (!stillSignIn && (gatePattern.test(previewText) || advancedVisible)) {
    await ctx.close();
    fail(11, {
      step: "negative_bad_password",
      message: "Protected host broadcast reachable after failed login",
      url: page.url(),
    });
  }
  await ctx.close();
}

// --- Positive: valid host sign-in → broadcast → saved branding ---
const ctx = await browser.newContext();
const page = await ctx.newPage();
await hostSignIn(page, email, password);
try {
  await page.waitForURL(u => !u.pathname.includes("sign-in"), { timeout: 120_000 });
} catch {
  await ctx.close();
  await browser.close();
  fail(20, { step: "positive_sign_in", message: "Did not leave sign-in after valid credentials" });
}

const postLoginPath = new URL(page.url()).pathname;
if (!postLoginPath.includes(cred.testHostSlug)) {
  await ctx.close();
  await browser.close();
  fail(21, {
    step: "positive_post_login_url",
    message: "Post-login URL missing expected host slug",
    postLoginPath,
    expectedSlug: cred.testHostSlug,
  });
}

await page.goto(broadcastUrl, { waitUntil: "domcontentloaded" });
const finalUrl = page.url();
if (!finalUrl.includes(cred.testEventId) || !finalUrl.includes(cred.testHostSlug)) {
  await ctx.close();
  await browser.close();
  fail(22, { step: "positive_broadcast_url", message: "Broadcast URL mismatch", finalUrl });
}

await page.getByRole("heading", { name: /Advanced Studio/i }).waitFor({ timeout: 120_000 });

const previewText = await readBrandingPreview(page);
const hasGateA = gatePattern.test(previewText);

console.log(
  JSON.stringify(
    {
      ok: hasGateA,
      mode: "production-verify",
      base,
      debugEndpoint: debug,
      broadcastUrl: finalUrl,
      postLoginPath,
      brandingPreviewHasGateA: hasGateA,
      previewSnippet: previewText.trim().slice(0, 120),
    },
    null,
    2
  )
);

await ctx.close();
await browser.close();

if (!hasGateA) process.exit(2);
process.exit(0);
