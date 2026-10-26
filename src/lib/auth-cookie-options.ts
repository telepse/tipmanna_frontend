import type { NextRequest } from "next/server";

/**
 * Whether auth HttpOnly cookies should use the Secure flag.
 *
 * Production `next start` over plain HTTP (local prod smoke, disposable E2E)
 * must not set Secure — browsers withhold those cookies from server actions.
 * HTTPS deployments (or `x-forwarded-proto: https`) keep Secure in production.
 */
export function authCookieSecureFromRequest(
  req: Pick<NextRequest, "headers" | "nextUrl">
): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;

  const forwarded = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded === "http") return false;
  if (forwarded === "https") return true;

  if (req.nextUrl.protocol === "http:") return false;
  if (req.nextUrl.protocol === "https:") return true;

  return process.env.NODE_ENV === "production";
}

/** Fallback when no request (rare); prefer {@link authCookieSecureFromRequest}. */
export function authCookieSecureDefault(): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "false") return false;
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}
