import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3000";

function streamingB1EnvFromSeed(): Record<string, string> {
  if (process.env.STREAMING_B1_E2E !== "1") return {};
  const seedPath =
    process.env.STREAMING_B1_E2E_SEED_PATH?.trim() ??
    path.join(__dirname, ".streaming-b1-e2e.json");
  if (!existsSync(seedPath)) return {};
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as {
    eventId: string;
    hostSlug: string;
  };
  return {
    STREAMING_B1_E2E_EVENT_ID: seed.eventId,
    STREAMING_B1_E2E_HOST_SLUG: seed.hostSlug,
    NEXT_PUBLIC_BACKEND_API_URL:
      process.env.NEXT_PUBLIC_BACKEND_API_URL ??
      "http://127.0.0.1:8014/api/v1",
  };
}

const streamingB1Enabled = process.env.STREAMING_B1_E2E === "1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const authEnabled = process.env.PLAYWRIGHT_AUTH_E2E === "1";

function isLocalPlaywrightBase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return true;
  }
}

const useLocalWebServer = isLocalPlaywrightBase(baseURL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  globalSetup: "./e2e/global-setup.ts",
  ...(streamingB1Enabled ? { env: streamingB1EnvFromSeed() } : {}),
  use: {
    baseURL,
    trace: process.env.RUNTIME_HUNT ? "on" : "on-first-retry",
    ...(baseURL.includes("ngrok-free.dev") || baseURL.includes("ngrok.app")
      ? { extraHTTPHeaders: { "ngrok-skip-browser-warning": "69420" } }
      : {}),
  },
  ...(useLocalWebServer
    ? {
        webServer: {
          command:
            process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.trim() ??
            (streamingB1Enabled
              ? `npm run dev -- -p ${port}`
              : `npm run start -- -p ${port}`),
          url: baseURL,
          reuseExistingServer:
            !process.env.CI && !process.env.PLAYWRIGHT_FORCE_BUILD,
          timeout: streamingB1Enabled ? 300_000 : 180_000,
        },
      }
    : {}),
  projects: [
    ...(streamingB1Enabled
      ? [
          {
            name: "setup-streaming-b1",
            testMatch: /streaming-b1-auth\.setup\.ts/,
            timeout: 120_000,
          },
          {
            name: "streaming-b1-chromium",
            testMatch: /host-advanced-studio-disposable\.spec\.ts/,
            dependencies: ["setup-streaming-b1"],
            timeout: 180_000,
            use: {
              ...devices["Desktop Chrome"],
              storageState: ".auth/streaming-b1-host.json",
              ...(process.env.PLAYWRIGHT_CHANNEL
                ? { channel: process.env.PLAYWRIGHT_CHANNEL as "chrome" }
                : {}),
            },
          },
        ]
      : []),
    ...(authEnabled
      ? [
          {
            name: "setup-auth",
            testMatch: /auth\.setup\.ts/,
            timeout: 180_000,
          },
          {
            name: "chromium-signed-in",
            testMatch: /explore-signed-in-matrix\.spec\.ts/,
            dependencies: ["setup-auth"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: ".auth/tipper.json",
              ...(process.env.PLAYWRIGHT_CHANNEL
                ? { channel: process.env.PLAYWRIGHT_CHANNEL as "chrome" }
                : {}),
            },
          },
        ]
      : []),
    {
      name: "chromium",
      testIgnore: [
        /streaming-b1-auth\.setup\.ts/,
        /host-advanced-studio-disposable\.spec\.ts/,
        ...(authEnabled
          ? [/auth\.setup\.ts/, /explore-signed-in-matrix\.spec\.ts/]
          : [/auth\.setup\.ts/]),
      ],
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_CHANNEL
          ? { channel: process.env.PLAYWRIGHT_CHANNEL as "chrome" }
          : {}),
      },
    },
  ],
});
