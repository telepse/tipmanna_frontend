import type { FullConfig } from "@playwright/test";

const BACKEND_HEALTH_URL =
  process.env.PLAYWRIGHT_BACKEND_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/api\/v1\/?$/, "") ??
  "http://127.0.0.1:8000";

const HEALTH_URL = `${BACKEND_HEALTH_URL}/health`;
const POLL_MS = 1000;
const MAX_WAIT_MS = 60_000;

async function waitForBackendHealth(): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_BACKEND_HEALTH === "true") {
    console.warn(
      "[playwright globalSetup] Skipping backend health check (PLAYWRIGHT_SKIP_BACKEND_HEALTH=true)"
    );
    return;
  }

  const started = Date.now();
  let lastError = "";

  while (Date.now() - started < MAX_WAIT_MS) {
    try {
      const res = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        console.info(
          `[playwright globalSetup] Backend healthy at ${HEALTH_URL}`
        );
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }

  console.warn(
    `[playwright globalSetup] Backend not healthy at ${HEALTH_URL} after ${MAX_WAIT_MS}ms (${lastError}). ` +
      "Real-route Explore tests may skip or fail. Start the backend or set PLAYWRIGHT_SKIP_BACKEND_HEALTH=true for fixture-only runs."
  );
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await waitForBackendHealth();
}
