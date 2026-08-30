"use client";

import Cookies from "js-cookie";

export const VISITOR_SESSION_MS = 24 * 60 * 60 * 1000;
const TIMESTAMP_KEY = "visitorTimestamp";

export function touchVisitorTimestamp(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}

export function clearVisitorTimestamp(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TIMESTAMP_KEY);
}

export function isVisitorClientExpired(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(TIMESTAMP_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts > VISITOR_SESSION_MS;
}

/** Visitor id to merge on sign-in/up when session is still active. */
export function getVisitorIdForAuthMerge(
  user: { id?: string; role?: string } | null | undefined
): string | undefined {
  if (!user?.id || user.role !== "VISITOR") return undefined;
  if (isVisitorClientExpired()) return undefined;
  return user.id;
}

export function getVisitorUserFromCookies(): {
  id?: string;
  role?: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = Cookies.get("visitorUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id?: string; role?: string };
  } catch {
    return null;
  }
}

export function getVisitorIdForAuthMergeFromClient(): string | undefined {
  if (isVisitorClientExpired()) return undefined;
  const cookieUser = getVisitorUserFromCookies();
  if (cookieUser?.role?.toUpperCase() === "VISITOR" && cookieUser.id) {
    return cookieUser.id;
  }
  return undefined;
}
