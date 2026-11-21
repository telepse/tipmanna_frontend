import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  isAllowedPaymentOrigin,
  PAYMENT_ORIGIN_STORAGE_KEY,
} from "@/lib/payment-origin";
import { sanitizeEventIdForRoomRedirect } from "@/lib/public-video-url";
import { shouldHardNavigatePaymentReturn } from "@/lib/tiplink-payment-return";
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

function navigateToPath(
  router: AppRouterInstance,
  path: string,
  mode: "soft" | "hard" = "soft"
): void {
  if (mode === "hard") {
    window.location.assign(path);
    return;
  }
  router.replace(path);
  scheduleRedirectWatchdog(path);
}

/**
 * Navigate back to where payment started.
 * TipLink (`/l/...`) uses a hard navigation so Instagram/TikTok WebViews load
 * fresh chunks after Stripe (avoids Failed to load chunk on soft replace).
 * Other surfaces keep soft router.replace + watchdog.
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
      const parsed = new URL(origin);
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      const target = path || "/explore";
      const mode = shouldHardNavigatePaymentReturn(parsed.pathname)
        ? "hard"
        : "soft";
      navigateToPath(router, target, mode);
      return;
    }
    localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
  } catch {
    localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
  }

  consumedForPaymentIntent = piKey ?? "__anonymous__";

  const safeEventId = sanitizeEventIdForRoomRedirect(fallbackEventId);
  if (safeEventId) {
    navigateToPath(router, `/room/${safeEventId}`, "soft");
    try {
      localStorage.removeItem("eventId");
      localStorage.removeItem("amount");
    } catch {
      /* ignore */
    }
    return;
  }

  navigateToPath(router, "/explore", "soft");
}
