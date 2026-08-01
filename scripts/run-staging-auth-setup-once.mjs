#!/usr/bin/env node
/**
 * Run one staging auth setup with env validation (no secret values printed).
 */
import { spawnSync } from "node:child_process";

const required = [
  "PLAYWRIGHT_AUTH_E2E",
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_BACKEND_URL",
  "PLAYWRIGHT_TIPPER_EMAIL",
  "TIPMANNA_E2E_AUTH_CODE",
] as const;

const optional = ["PLAYWRIGHT_E2E_AUTH_HELPER_SECRET"] as const;

function status(name) {
  const v = process.env[name]?.trim();
  console.info(`${name}=${v ? "SET" : "MISSING"}`);
  return Boolean(v);
}

let ok = true;
for (const name of required) {
  if (!status(name)) ok = false;
}
for (const name of optional) {
  status(name);
}

if (!ok) {
  console.error(
    "STAGING_AUTH_SETUP_BLOCKED: set required env vars before running setup-auth"
  );
  process.exit(1);
}

if (process.env.PLAYWRIGHT_AUTH_E2E !== "1") {
  console.error("PLAYWRIGHT_AUTH_E2E must equal 1");
  process.exit(1);
}
if (process.env.TIPMANNA_E2E_AUTH_CODE !== "1") {
  console.error("TIPMANNA_E2E_AUTH_CODE must equal 1");
  process.exit(1);
}

try {
  const frontendHost = new URL(process.env.PLAYWRIGHT_BASE_URL).hostname;
  const backendHost = new URL(process.env.PLAYWRIGHT_BACKEND_URL).hostname;
  console.info(`frontendHost=${frontendHost}`);
  console.info(`backendHost=${backendHost}`);
} catch {
  console.error("Invalid PLAYWRIGHT_BASE_URL or PLAYWRIGHT_BACKEND_URL");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["playwright", "test", "--project=setup-auth", "--workers=1"],
  { stdio: "inherit", shell: true, env: process.env }
);
process.exit(result.status ?? 1);
