import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

import {
  authCookieSecureDefault,
  authCookieSecureFromRequest,
} from "@/lib/auth-cookie-options";

describe("authCookieSecureFromRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses non-secure cookies for http localhost in production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = new NextRequest("http://127.0.0.1:3014/api/auth/host-session");
    expect(authCookieSecureFromRequest(req)).toBe(false);
  });

  it("uses secure cookies for https in production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = new NextRequest("https://finish-b.example/api/auth/host-session");
    expect(authCookieSecureFromRequest(req)).toBe(true);
  });

  it("respects AUTH_COOKIE_SECURE override", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_COOKIE_SECURE", "true");
    const req = new NextRequest("http://127.0.0.1:3014/api/auth/host-session");
    expect(authCookieSecureFromRequest(req)).toBe(true);
  });
});

describe("authCookieSecureDefault", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to non-secure in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(authCookieSecureDefault()).toBe(false);
  });
});
