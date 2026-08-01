/**
 * Resolve Playwright backend root for health checks and staging auth helper polling.
 * Never log secrets or full URLs with query strings.
 */

const LOCAL_FRONTEND_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function hostnameFromUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).hostname;
  } catch {
    return null;
  }
}

export function isLocalFrontendBaseUrl(baseUrl: string | undefined): boolean {
  const host = hostnameFromUrl(baseUrl);
  return host != null && LOCAL_FRONTEND_HOSTS.has(host);
}

export function normalizeBackendRoot(raw: string): string {
  return raw
    .trim()
    .replace(/\/$/, "")
    .replace(/\/api\/v1\/?$/, "");
}

export type PlaywrightBackendResolution =
  | { ok: true; backendRoot: string; frontendHost: string | null }
  | { ok: false; reason: string };

/**
 * Local frontend tests may default to localhost backend.
 * Deployed staging frontend tests must set PLAYWRIGHT_BACKEND_URL explicitly.
 */
export function resolvePlaywrightBackendRoot(): PlaywrightBackendResolution {
  const frontendHost = hostnameFromUrl(process.env.PLAYWRIGHT_BASE_URL);
  const explicit = process.env.PLAYWRIGHT_BACKEND_URL?.trim();

  if (explicit) {
    return {
      ok: true,
      backendRoot: normalizeBackendRoot(explicit),
      frontendHost,
    };
  }

  if (isLocalFrontendBaseUrl(process.env.PLAYWRIGHT_BASE_URL)) {
    return {
      ok: true,
      backendRoot: "http://127.0.0.1:8000",
      frontendHost,
    };
  }

  if (
    frontendHost &&
    !isLocalFrontendBaseUrl(process.env.PLAYWRIGHT_BASE_URL)
  ) {
    return {
      ok: false,
      reason:
        "staging frontend/local backend mismatch: set PLAYWRIGHT_BACKEND_URL to the staging API host root (no /api/v1 suffix)",
    };
  }

  return {
    ok: true,
    backendRoot: "http://127.0.0.1:8000",
    frontendHost,
  };
}

export function assertPlaywrightBackendAligned(): PlaywrightBackendResolution {
  const resolved = resolvePlaywrightBackendRoot();
  if (!resolved.ok) {
    throw new Error(resolved.reason);
  }
  return resolved;
}
