import type { FullConfig } from "@playwright/test";

import {
  assertPlaywrightBackendAligned,
  hostnameFromUrl,
  resolvePlaywrightBackendRoot,
} from "./helpers/playwright-backend-config";

const POLL_MS = 1000;
const MAX_WAIT_MS = 60_000;

async function waitForBackendHealth(backendRoot: string): Promise<void> {
  const healthUrl = `${backendRoot.replace(/\/$/, "")}/health`;
  const backendHost = hostnameFromUrl(backendRoot) ?? backendRoot;
  const started = Date.now();
  let lastError = "";

  while (Date.now() - started < MAX_WAIT_MS) {
    try {
      const res = await fetch(healthUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        console.info(
          `[playwright globalSetup] Backend healthy host=${backendHost}`
        );
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }

  throw new Error(
    `[playwright globalSetup] backend unreachable host=${backendHost} (${lastError})`
  );
}

async function probeHelperAvailability(backendRoot: string): Promise<void> {
  if (process.env.TIPMANNA_E2E_AUTH_CODE !== "1") return;

  const backendHost = hostnameFromUrl(backendRoot) ?? backendRoot;
  const headers: Record<string, string> = {};
  const helperSecret = process.env.PLAYWRIGHT_E2E_AUTH_HELPER_SECRET?.trim();
  if (helperSecret) {
    headers["x-tipmanna-e2e-auth-secret"] = helperSecret;
  }

  try {
    const res = await fetch(
      `${backendRoot}/api/v1/auth/e2e/verification-code?email=probe%40invalid.example`,
      { headers, signal: AbortSignal.timeout(5_000) }
    );
    if (res.status === 404 || res.status === 403) {
      console.info(
        `[playwright globalSetup] Helper probe host=${backendHost} status=${res.status}`
      );
      return;
    }
    console.info(
      `[playwright globalSetup] Helper probe host=${backendHost} status=${res.status}`
    );
  } catch (e) {
    console.warn(
      `[playwright globalSetup] Helper probe failed host=${backendHost} (${e instanceof Error ? e.message : String(e)})`
    );
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_BACKEND_HEALTH === "true") {
    console.warn(
      "[playwright globalSetup] Skipping backend health check (PLAYWRIGHT_SKIP_BACKEND_HEALTH=true)"
    );
    return;
  }

  const frontendHost = hostnameFromUrl(process.env.PLAYWRIGHT_BASE_URL);
  const resolved = resolvePlaywrightBackendRoot();
  if (!resolved.ok) {
    throw new Error(`[playwright globalSetup] ${resolved.reason}`);
  }

  console.info(
    `[playwright globalSetup] frontendHost=${frontendHost ?? "default-local"} backendHost=${hostnameFromUrl(resolved.backendRoot) ?? resolved.backendRoot}`
  );

  assertPlaywrightBackendAligned();
  await waitForBackendHealth(resolved.backendRoot);
  await probeHelperAvailability(resolved.backendRoot);
}
