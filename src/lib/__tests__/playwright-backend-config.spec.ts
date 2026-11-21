import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hostnameFromUrl,
  isLocalFrontendBaseUrl,
  resolvePlaywrightBackendRoot,
} from "../../../e2e/helpers/playwright-backend-config";

describe("playwright-backend-config", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults local frontend to localhost backend", () => {
    process.env.PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000";
    delete process.env.PLAYWRIGHT_BACKEND_URL;
    const resolved = resolvePlaywrightBackendRoot();
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.backendRoot).toBe("http://127.0.0.1:8000");
    }
  });

  it("requires explicit backend for deployed staging frontend", () => {
    process.env.PLAYWRIGHT_BASE_URL =
      "https://tipmanna-fj3ffgvfq-test01.vercel.app";
    delete process.env.PLAYWRIGHT_BACKEND_URL;
    const resolved = resolvePlaywrightBackendRoot();
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.reason).toContain(
        "staging frontend/local backend mismatch"
      );
    }
  });

  it("uses PLAYWRIGHT_BACKEND_URL without /api/v1 suffix", () => {
    process.env.PLAYWRIGHT_BASE_URL =
      "https://tipmanna-fj3ffgvfq-test01.vercel.app";
    process.env.PLAYWRIGHT_BACKEND_URL =
      "https://tipmanna-staging.onrender.com/api/v1";
    const resolved = resolvePlaywrightBackendRoot();
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.backendRoot).toBe(
        "https://tipmanna-staging.onrender.com"
      );
      expect(hostnameFromUrl(resolved.backendRoot)).toBe(
        "tipmanna-staging.onrender.com"
      );
    }
  });

  it("detects local frontend hosts", () => {
    expect(isLocalFrontendBaseUrl("http://localhost:3000")).toBe(true);
    expect(
      isLocalFrontendBaseUrl("https://tipmanna-fj3ffgvfq-test01.vercel.app")
    ).toBe(false);
  });
});
