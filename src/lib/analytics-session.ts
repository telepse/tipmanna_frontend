import type { DeviceCategory } from "./analytics-types";

const SESSION_KEY = "tipmanna-analytics-session";

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess-fallback-${Date.now()}`;
  }
}

export function getDeviceCategory(): DeviceCategory {
  if (typeof window === "undefined") return "unknown";
  try {
    return window.matchMedia("(max-width: 768px)").matches
      ? "mobile"
      : "desktop";
  } catch {
    return "unknown";
  }
}
