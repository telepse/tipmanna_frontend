import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

import {
  authCookieInsecureOverrideActive,
  authCookieSecureDefault,
  authCookieSecureFromRequest,
} from "@/lib/auth-cookie-options";

function req(url: string, headers?: Record<string, string>) {
  const r = new NextRequest(url);
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      r.headers.set(k, v);
    }
  }
  return r;
}

describe("authCookieSecureFromRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses non-secure cookies for http localhost in production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      authCookieSecureFromRequest(
        req("http://127.0.0.1:3014/api/auth/host-session")
      )
    ).toBe(false);
  });

  it("uses secure cookies for https direct URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      authCookieSecureFromRequest(
        req("https://finish-b.example/api/auth/host-session")
      )
    ).toBe(true);
  });

  it("ignores x-forwarded-proto http downgrade without trust flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      authCookieSecureFromRequest(
        req("https://finish-b.example/api/auth/host-session", {
          "x-forwarded-proto": "http",
        })
      )
    ).toBe(true);
  });

  it("honors x-forwarded-proto https when AUTH_TRUST_FORWARDED_PROTO=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_TRUST_FORWARDED_PROTO", "true");
    expect(
      authCookieSecureFromRequest(
        req("http://127.0.0.1:3014/api/auth/host-session", {
          "x-forwarded-proto": "https",
        })
      )
    ).toBe(true);
  });

  it("honors x-forwarded-proto http only when trusted (tunnel to local node)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_TRUST_FORWARDED_PROTO", "true");
    expect(
      authCookieSecureFromRequest(
        req("http://127.0.0.1:3014/api/auth/host-session", {
          "x-forwarded-proto": "http",
        })
      )
    ).toBe(false);
  });

  it("AUTH_COOKIE_SECURE=true forces secure even on http", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_COOKIE_SECURE", "true");
    expect(
      authCookieSecureFromRequest(
        req("http://127.0.0.1:3014/api/auth/host-session")
      )
    ).toBe(true);
  });
});

describe("authCookieInsecureOverrideActive", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows AUTH_COOKIE_SECURE=false in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");
    expect(authCookieInsecureOverrideActive()).toBe(true);
  });

  it("blocks AUTH_COOKIE_SECURE=false in production without ALLOW_INSECURE_AUTH_COOKIES", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");
    expect(authCookieInsecureOverrideActive()).toBe(false);
    expect(
      authCookieSecureFromRequest(
        req("http://127.0.0.1:3014/api/auth/host-session")
      )
    ).toBe(false);
  });

  it("allows explicit ALLOW_INSECURE_AUTH_COOKIES=1 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");
    vi.stubEnv("ALLOW_INSECURE_AUTH_COOKIES", "1");
    expect(authCookieInsecureOverrideActive()).toBe(true);
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

  it("defaults to secure in production when no insecure override", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(authCookieSecureDefault()).toBe(true);
  });
});
