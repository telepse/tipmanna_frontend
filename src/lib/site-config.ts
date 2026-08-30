export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://tipmanna.tv";

export const DISCOVERY_SITE_URL =
  process.env.NEXT_PUBLIC_DISCOVERY_SITE_URL || "https://tipmanna.com";

export const LEGACY_HOSTS = ["tipmanna.live", "www.tipmanna.live"];

/**
 * Canonical primary application origin (tipmanna.tv). All product surfaces,
 * canonicals, sitemaps, and legacy-host redirects consolidate here.
 */
export function getPrimaryOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_PRIMARY_ORIGIN?.trim() || SITE_URL;
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const origin = new URL(normalized).origin;
    assertProductionOrigin(origin);
    return origin;
  } catch {
    return "https://tipmanna.tv";
  }
}

function assertProductionOrigin(origin: string): void {
  if (process.env.NODE_ENV !== "production") return;
  if (/localhost|127\.0\.0\.1/i.test(origin)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_PRIMARY_ORIGIN for production build: ${origin}. Set NEXT_PUBLIC_PRIMARY_ORIGIN to your live domain before building.`
    );
  }
}

/** How the legacy discovery host (.com) behaves. */
export type LegacyRedirectMode = "path-preserving" | "partner-only" | "off";

/**
 * Configurable redirect behavior for the legacy discovery host (.com).
 * Defaults to path-preserving so entity/discovery equity is retained while the
 * root and marketing routes funnel to the partner page.
 */
export function getLegacyRedirectMode(): LegacyRedirectMode {
  const raw =
    process.env.NEXT_PUBLIC_LEGACY_REDIRECT_MODE?.trim().toLowerCase();
  if (raw === "off" || raw === "partner-only" || raw === "path-preserving") {
    return raw;
  }
  return "path-preserving";
}

/**
 * Path prefixes whose SEO/backlink equity is preserved when redirecting from
 * the legacy host. Everything else funnels to `/partner`.
 */
export const LEGACY_REDIRECT_PRESERVED_PREFIXES = [
  "/discover",
  "/content",
  "/channel",
  "/program",
  "/community",
  "/c",
];

export function isPreservedLegacyPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  return LEGACY_REDIRECT_PRESERVED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Resolve the absolute `.tv` URL a legacy `.com` request should redirect to.
 * Returns `null` when redirects are disabled.
 */
export function resolveLegacyRedirectTarget(
  pathname: string,
  search = "",
  mode: LegacyRedirectMode = getLegacyRedirectMode()
): string | null {
  if (mode === "off") return null;
  const origin = getPrimaryOrigin();
  if (mode === "partner-only") return `${origin}/partner`;
  if (isPreservedLegacyPath(pathname)) {
    return `${origin}${pathname}${search ?? ""}`;
  }
  return `${origin}/partner`;
}

/** Feature flag: long-lived Explore session shell (defaults on). */
export function isExploreSessionShellEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_EXPLORE_SESSION_SHELL?.trim();
  return raw !== "0" && raw !== "false";
}

/** Feature flag: unified Discover navigation model (defaults on). */
export function isUnifiedDiscoverNavEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_UNIFIED_DISCOVER_NAV?.trim();
  return raw !== "0" && raw !== "false";
}

/**
 * Host creator `@username` page: flat TikTok-style channel grid (no event headers).
 * Set `NEXT_PUBLIC_HOST_CREATOR_CHANNELS_FLAT_GRID=true` to enable.
 */
export function isHostCreatorChannelsFlatGridEnabled(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_HOST_CREATOR_CHANNELS_FLAT_GRID?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

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

/**
 * @deprecated Architecture consolidated onto tipmanna.tv. Discovery now lives in
 * the primary application; the legacy `.com` host is redirect-only (see
 * `resolveLegacyRedirectTarget`). Retained for rollback only — do not use for
 * new canonical/sitemap/metadata work; use `getPublicAbsoluteUrl` instead.
 */
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

/**
 * Absolute URL for a path starting with `/` (or relative segment).
 *
 * Public/production URLs derive from the single origin authority
 * {@link getPrimaryOrigin} (tipmanna.tv) so canonicals, metadata, structured
 * data, sitemaps, and public entity share links never resolve to a non-public
 * origin (e.g. a localhost dev value of `NEXT_PUBLIC_FRONTEND_APP_URL`).
 */
export function getPublicAbsoluteUrl(path: string): string {
  const base = getPrimaryOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getDiscoveryAbsoluteUrl(path: string): string {
  const base = getDiscoveryFrontendOrigin().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
