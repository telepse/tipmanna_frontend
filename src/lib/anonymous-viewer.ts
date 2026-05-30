"use client";

import type { UserInfo } from "@/types/tracking.types";

const STORAGE_KEY = "currentUser";

/**
 * Stable anonymous/session identity used for TV global presence / analytics.
 * Reuses legacy `currentUser` localStorage key shared with Explore.
 */
export function getOrCreateAnonymousViewer(): UserInfo {
  if (typeof window === "undefined") {
    return {
      id: "",
      type: "anonymous",
      username: "Anonymous",
      isAuthenticated: false,
    };
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved) as UserInfo;
      if (p?.id) return p;
    }
  } catch {
    /* ignore */
  }
  const nu: UserInfo = {
    id: `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: "anonymous",
    username: "Anonymous User",
    isAuthenticated: false,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nu));
  return nu;
}
