import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3000";
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
  use: {
    baseURL,
    trace: process.env.RUNTIME_HUNT ? "on" : "on-first-retry",
  },
  ...(useLocalWebServer
    ? {
        webServer: {
          command: `npm run start -- -p ${port}`,
          url: baseURL,
          reuseExistingServer:
            !process.env.CI && !process.env.PLAYWRIGHT_FORCE_BUILD,
          timeout: 180_000,
        },
      }
    : {}),
  projects: [
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
      testIgnore: authEnabled
        ? [/auth\.setup\.ts/, /explore-signed-in-matrix\.spec\.ts/]
        : [/auth\.setup\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_CHANNEL
          ? { channel: process.env.PLAYWRIGHT_CHANNEL as "chrome" }
          : {}),
      },
    },
  ],
});
