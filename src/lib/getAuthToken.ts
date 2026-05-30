"use client";

import Cookies from "js-cookie";

/**
 * Client auth token for immediate API calls after login.
 * Primary session is the HttpOnly `token` cookie (read server-side via getToken).
 * Redux persist mirrors token/user for client rehydrate after hard refresh.
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const persistRoot = localStorage.getItem("persist:root");
    if (persistRoot) {
      const root = JSON.parse(persistRoot) as { auth?: string };
      if (root.auth) {
        const auth = JSON.parse(root.auth) as { token?: string };
        if (auth.token?.trim()) return auth.token.trim();
      }
    }
  } catch {
    /* ignore */
  }

  const visitorToken = Cookies.get("visitorToken")?.trim();
  if (visitorToken) return visitorToken;

  return null;
}

export function getAuthUserFromCookies(): {
  id?: string;
  role?: string;
  email?: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = Cookies.get("visitorUser") ?? Cookies.get("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id?: string; role?: string; email?: string };
  } catch {
    return null;
  }
}

export function isGuestSession(): boolean {
  const user = getAuthUserFromCookies();
  return user?.role?.toLowerCase() === "visitor" || !getAuthToken();
}

export function getDeviceKey(): string {
  if (typeof window === "undefined") return "server";
  const key = "tipmanna_device_key";
  let dk = localStorage.getItem(key);
  if (!dk) {
    const legacy = localStorage.getItem("tm_device_key");
    if (legacy) {
      dk = legacy;
      localStorage.setItem(key, legacy);
      localStorage.removeItem("tm_device_key");
    }
  }
  if (!dk) {
    dk =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, dk);
  }
  return dk;
}

/** @deprecated use getAuthToken */
export function getClientTokenFromPersist(): string | null {
  return getAuthToken();
}
