"use client";

const STORAGE_KEY = "tipmanna:host-session-verify-grant";
export const HOST_SESSION_GRANT_TTL_MS = 30_000;

type StoredGrant = {
  hostId: string;
  verifiedAt: number;
};

function readStoredGrant(): StoredGrant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGrant;
    if (
      typeof parsed.hostId !== "string" ||
      typeof parsed.verifiedAt !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeHostSessionGrant(hostId: string): void {
  if (typeof window === "undefined" || !hostId) return;
  const payload: StoredGrant = { hostId, verifiedAt: Date.now() };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearHostSessionGrant(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** True when a prior successful verify grant matches hostId and is within TTL. */
export function isHostSessionGrantValid(
  hostId: string | null | undefined
): boolean {
  if (!hostId) return false;
  const grant = readStoredGrant();
  if (!grant || grant.hostId !== hostId) return false;
  return Date.now() - grant.verifiedAt < HOST_SESSION_GRANT_TTL_MS;
}

/** Used to skip redundant dashboard host touch right after verify. */
export function wasHostSessionRecentlyVerified(
  hostId?: string | null
): boolean {
  const grant = readStoredGrant();
  if (!grant) return false;
  if (hostId && grant.hostId !== hostId) return false;
  return Date.now() - grant.verifiedAt < HOST_SESSION_GRANT_TTL_MS;
}
