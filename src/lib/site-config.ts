export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://tipmanna.tv";

export const DISCOVERY_SITE_URL =
  process.env.NEXT_PUBLIC_DISCOVERY_SITE_URL || "https://tipmanna.com";

export const LEGACY_HOSTS = ["tipmanna.live", "www.tipmanna.live"];

function parseHostList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  return raw
    .split(",")
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
}

/** Hostnames that serve the discovery homepage at `/` → `/discover`. */
export function getDiscoveryHosts(): string[] {
  return parseHostList(process.env.NEXT_PUBLIC_DISCOVERY_HOSTS, [
    "tipmanna.com",
    "www.tipmanna.com",
  ]);
}

export function isDiscoveryHost(hostname: string): boolean {
  const h = hostname.split(":")[0].toLowerCase();
  return getDiscoveryHosts().some(
    d => h === d || h.endsWith(`.${d.replace(/^www\./, "")}`)
  );
}

export function isTvHost(hostname: string): boolean {
  const h = hostname.split(":")[0].toLowerCase();
  return h === "tipmanna.tv" || h.endsWith(".tipmanna.tv");
}

/**
 * Canonical site origin for share links, QR targets, and metadata.
 * Prefer `NEXT_PUBLIC_FRONTEND_APP_URL`, then `window.location` on the client,
 * then host-aware defaults on the server.
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

/** Discovery-domain canonical origin (tipmanna.com). */
export function getDiscoveryFrontendOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_DISCOVERY_FRONTEND_APP_URL?.trim();
  if (raw) {
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return new URL(normalized).origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    const host = window.location.hostname.toLowerCase();
    if (isDiscoveryHost(host)) return window.location.origin;
  }
  const site = DISCOVERY_SITE_URL.replace(/\/$/, "");
  try {
    return new URL(site.startsWith("http") ? site : `https://${site}`).origin;
  } catch {
    return "https://tipmanna.com";
  }
}

/** Absolute URL for a path starting with `/` (or relative segment). */
export function getPublicAbsoluteUrl(path: string): string {
  const base = getPublicFrontendOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getDiscoveryAbsoluteUrl(path: string): string {
  const base = getDiscoveryFrontendOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
