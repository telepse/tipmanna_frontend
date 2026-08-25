import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  isAllowedPaymentOrigin,
  PAYMENT_ORIGIN_STORAGE_KEY,
} from "@/lib/payment-origin";
import { sanitizeEventIdForRoomRedirect } from "@/lib/public-video-url";
import { setPaymentPendingReturn } from "@/lib/tv-payment-snapshot";

/** Hard-nav fallback when soft router.replace fails to leave /success. */
export const REDIRECT_WATCHDOG_MS = 1200;

let consumedForPaymentIntent: string | null = null;

export function resetPaymentSuccessRedirectForTests(): void {
  consumedForPaymentIntent = null;
}

function scheduleRedirectWatchdog(path: string): void {
  if (typeof window === "undefined") return;
  const targetPath = path.startsWith("/") ? path : `/${path}`;
  setTimeout(() => {
    try {
      const currentPath =
        `${window.location.pathname}${window.location.search}${window.location.hash}` ||
        "/";
      if (
        window.location.pathname.replace(/\/$/, "") === "/success" ||
        currentPath === "/success"
      ) {
        window.location.assign(targetPath);
      }
    } catch {
      /* ignore */
    }
  }, REDIRECT_WATCHDOG_MS);
}

function navigateToPath(router: AppRouterInstance, path: string): void {
  router.replace(path);
  scheduleRedirectWatchdog(path);
}

/**
 * Single in-app navigation back to where payment started (no full page reload when origin is allowed).
 */
export function redirectAfterPaymentSuccess(
  router: AppRouterInstance,
  fallbackEventId: string | null,
  paymentIntentId?: string | null
): void {
  if (typeof window === "undefined") return;

  const piKey = paymentIntentId?.trim() || null;
  if (piKey && consumedForPaymentIntent === piKey) return;
  if (!piKey && consumedForPaymentIntent === "__anonymous__") return;

  try {
    const origin = localStorage.getItem(PAYMENT_ORIGIN_STORAGE_KEY);
    if (origin && isAllowedPaymentOrigin(origin)) {
      consumedForPaymentIntent = piKey ?? "__anonymous__";
      localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
      setPaymentPendingReturn(true);
      const path = `${new URL(origin).pathname}${new URL(origin).search}${new URL(origin).hash}`;
      navigateToPath(router, path || "/explore");
      return;
    }
    localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
  } catch {
    localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
  }

  consumedForPaymentIntent = piKey ?? "__anonymous__";

  const safeEventId = sanitizeEventIdForRoomRedirect(fallbackEventId);
  if (safeEventId) {
    navigateToPath(router, `/room/${safeEventId}`);
    try {
      localStorage.removeItem("eventId");
      localStorage.removeItem("amount");
    } catch {
      /* ignore */
    }
    return;
  }

  navigateToPath(router, "/explore");
}
