/**
 * Disposable host + tipper cookies for STREAMING_B1 Playwright (5439 seed only).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";

import {
  applyStreamingB1SeedEnv,
  loadStreamingB1Seed,
} from "./helpers/streaming-b1-seed";

const authFile = path.join(__dirname, "../.auth/streaming-b1-host.json");

setup("streaming b1 host session (disposable seed)", async ({ page, baseURL }) => {
  setup.skip(
    process.env.STREAMING_B1_E2E !== "1",
    "Set STREAMING_B1_E2E=1 for Advanced Studio disposable journey"
  );

  const seed = loadStreamingB1Seed();
  applyStreamingB1SeedEnv(seed);
  mkdirSync(path.dirname(authFile), { recursive: true });

  const origin = baseURL ?? "http://127.0.0.1:3014";
  await page.goto(origin);

  const sessionRes = await page.request.post(`${origin}/api/auth/session`, {
    data: {
      token: seed.primaryToken,
      user: seed.tipperUser,
      expiresDays: 60,
    },
  });
  expect(sessionRes.ok()).toBeTruthy();

  const hostRes = await page.request.post(`${origin}/api/auth/host-session`, {
    data: {
      token: seed.hostToken,
      user: seed.hostUser,
      expiresDays: 7,
    },
  });
  expect(hostRes.ok()).toBeTruthy();

  const backendRoot =
    process.env.PLAYWRIGHT_BACKEND_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8014";
  const current = await page.request.get(
    `${backendRoot}/api/v1/events/${seed.eventId}/broadcasts/current`,
    { headers: { Authorization: `Bearer ${seed.hostToken}` } }
  );
  expect(current.ok(), "Re-run npm run streaming:b1:e2e-seed on backend").toBeTruthy();
  const body = (await current.json()) as { broadcast?: { id?: string } | null };
  expect(
    body.broadcast?.id,
    "Disposable PG missing seeded broadcast — run streaming:b1:e2e-seed"
  ).toBeTruthy();

  await page.evaluate(tipperUser => {
    const authState = {
      user: tipperUser,
      token: null,
      isAuthenticated: true,
      requiresVerification: false,
      tag: null,
      persistAuthHydrationComplete: true,
    };
    localStorage.setItem(
      "persist:root",
      JSON.stringify({
        auth: JSON.stringify(authState),
        tip: JSON.stringify({}),
        _persist: JSON.stringify({ version: -1, rehydrated: true }),
      })
    );
  }, seed.tipperUser);

  await page.context().storageState({ path: authFile });
});
