/**
 * Disposable host + tipper cookies for STREAMING_B1 Playwright (5439 seed only).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";

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

  const origin = baseURL ?? "http://127.0.0.1:3000";
  await page.goto(origin);

  await page.evaluate(async seedPayload => {
    const authState = {
      user: seedPayload.tipperUser,
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

    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        token: seedPayload.primaryToken,
        user: seedPayload.tipperUser,
        expiresDays: 60,
      }),
    });
    await fetch("/api/auth/host-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        token: seedPayload.hostToken,
        user: seedPayload.hostUser,
        expiresDays: 7,
      }),
    });
  }, seed);

  await page.context().storageState({ path: authFile });
});
