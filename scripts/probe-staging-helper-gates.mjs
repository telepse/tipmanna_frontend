#!/usr/bin/env node
/**
 * Probe staging helper gates without printing secrets, emails or codes.
 */
const backendRoot = (process.env.PLAYWRIGHT_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
if (!backendRoot) {
  console.error("PLAYWRIGHT_BACKEND_URL=MISSING");
  process.exit(1);
}

const backendHost = new URL(backendRoot).hostname;
console.info(`backendHost=${backendHost}`);

async function fetchJson(path, headers = {}) {
  const res = await fetch(`${backendRoot}${path}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, json };
}

const health = await fetchJson("/health?deploy=1");
console.info(
  JSON.stringify({
    event: "deploy_health",
    status: health.status,
    deployment: health.json?.deployment ?? null,
  })
);

const helperSecret = process.env.PLAYWRIGHT_E2E_AUTH_HELPER_SECRET?.trim();
const headers = helperSecret
  ? { "x-tipmanna-e2e-auth-secret": helperSecret }
  : {};

const noSecret = await fetchJson(
  "/api/v1/auth/e2e/verification-code?email=probe%40invalid.example"
);
console.info(
  JSON.stringify({
    event: "probe_no_secret",
    status: noSecret.status,
    reason: noSecret.json?.error?.reason ?? null,
  })
);

const withSecret = await fetchJson(
  "/api/v1/auth/e2e/verification-code?email=probe%40invalid.example",
  headers
);
console.info(
  JSON.stringify({
    event: "probe_with_secret",
    status: withSecret.status,
    reason: withSecret.json?.error?.reason ?? null,
  })
);

if (
  process.env.TIPMANNA_E2AUTHE__ALLOWLIST_EMAILS &&
  !process.env.TIPMANNA_E2E_AUTH_ALLOWLIST_EMAILS
) {
  console.error(
    "LOCAL_ENV_TYPO: rename TIPMANNA_E2AUTHE__ALLOWLIST_EMAILS to TIPMANNA_E2E_AUTH_ALLOWLIST_EMAILS on the Render service"
  );
}
