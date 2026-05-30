export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://tipmanna.tv";

export const LEGACY_HOSTS = ["tipmanna.live", "www.tipmanna.live"];

/**
 * Canonical site origin for share links, QR targets, and metadata.
 * Prefer `NEXT_PUBLIC_FRONTEND_APP_URL`, then `window.location` on the client,
 * then `NEXT_PUBLIC_SITE_URL` / `SITE_URL` (server-safe when env is unset).
 */
export function getPublicFrontendOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_FRONTEND_APP_URL?.trim();
  if (raw) {
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(normalized).origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const site = SITE_URL.replace(/\/$/, "");
  try {
    return new URL(site.startsWith("http") ? site : `https://${site}`).origin;
  } catch {
    return "https://tipmanna.tv";
  }
}

/** Absolute URL for a path starting with `/` (or relative segment). */
export function getPublicAbsoluteUrl(path: string): string {
  const base = getPublicFrontendOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
