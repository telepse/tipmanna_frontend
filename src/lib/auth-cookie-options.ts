import type { NextRequest } from "next/server";

function trustForwardedProto(): boolean {
  return (
    process.env.AUTH_TRUST_FORWARDED_PROTO === "true" ||
    process.env.TRUST_PROXY_HEADERS === "true"
  );
}

/** Explicit local-only insecure cookies (`AUTH_COOKIE_SECURE=false`). */
export function authCookieInsecureOverrideActive(): boolean {
  if (process.env.AUTH_COOKIE_SECURE !== "false") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_INSECURE_AUTH_COOKIES === "1";
}

/**
 * Whether auth HttpOnly cookies should use the Secure flag.
 *
 * - HTTPS deployments: Secure stays on (direct TLS or trusted `x-forwarded-proto`).
 * - Untrusted `x-forwarded-proto` is ignored unless AUTH_TRUST_FORWARDED_PROTO.
 * - `AUTH_COOKIE_SECURE=false` only applies in dev or with ALLOW_INSECURE_AUTH_COOKIES=1.
 */
export function authCookieSecureFromRequest(
  req: Pick<NextRequest, "headers" | "nextUrl">
): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (authCookieInsecureOverrideActive()) return false;

  if (trustForwardedProto()) {
    const forwarded = req.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();
    if (forwarded === "https") return true;
    if (forwarded === "http") return false;
  }

  if (req.nextUrl.protocol === "https:") return true;
  if (req.nextUrl.protocol === "http:") return false;

  return process.env.NODE_ENV === "production";
}

/** Fallback when no request (rare); prefer {@link authCookieSecureFromRequest}. */
export function authCookieSecureDefault(): boolean {
  if (process.env.AUTH_COOKIE_SECURE === "true") return true;
  if (authCookieInsecureOverrideActive()) return false;
  return process.env.NODE_ENV === "production";
}
