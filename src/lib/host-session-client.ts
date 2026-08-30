"use client";

import Cookies from "js-cookie";
import { clearHostSession } from "@/lib/session-client";

export type HostUserCookie = {
  id?: string;
  role?: string;
  eventSlug?: string;
  eventCode?: string;
  username?: string;
  email?: string;
  hostSessionExpiresAt?: string;
};

export function getHostUserFromCookies(): HostUserCookie | null {
  if (typeof window === "undefined") return null;
  const raw = Cookies.get("hostUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HostUserCookie;
  } catch {
    return null;
  }
}

/** Client-side marker only — token stays HttpOnly. */
export function hasActiveHostSession(expectedHostId?: string | null): boolean {
  const hostUser = getHostUserFromCookies();
  if (!hostUser?.id) return false;
  if (expectedHostId && hostUser.id !== expectedHostId) return false;
  const expiresAt = hostUser.hostSessionExpiresAt;
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
}

/**
 * Clear host session only when cookie host id clearly belongs to another account.
 * Does not clear when cookies are absent (fresh login race).
 */
export async function clearStaleHostSessionIfMismatch(
  linkedHostId: string | null | undefined
): Promise<void> {
  if (!linkedHostId) return;
  const hostUser = getHostUserFromCookies();
  if (!hostUser?.id) return;
  if (hostUser.id !== linkedHostId) {
    await clearHostSession();
  }
}
