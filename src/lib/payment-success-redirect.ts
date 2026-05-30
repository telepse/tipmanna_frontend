import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  isAllowedPaymentOrigin,
  PAYMENT_ORIGIN_STORAGE_KEY,
} from "@/lib/payment-origin";
import { sanitizeEventIdForRoomRedirect } from "@/lib/public-video-url";
import { setPaymentPendingReturn } from "@/lib/tv-payment-snapshot";

/**
 * Single in-app navigation back to where payment started (no full page reload when origin is allowed).
 */
export function redirectAfterPaymentSuccess(
  router: AppRouterInstance,
  fallbackEventId: string | null
): void {
  if (typeof window === "undefined") return;

  try {
    const origin = localStorage.getItem(PAYMENT_ORIGIN_STORAGE_KEY);
    if (origin && isAllowedPaymentOrigin(origin)) {
      localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
      setPaymentPendingReturn(true);
      const path = `${new URL(origin).pathname}${new URL(origin).search}${new URL(origin).hash}`;
      router.replace(path || "/");
      return;
    }
    localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
  } catch {
    localStorage.removeItem(PAYMENT_ORIGIN_STORAGE_KEY);
  }

  const safeEventId = sanitizeEventIdForRoomRedirect(fallbackEventId);
  if (safeEventId) {
    router.replace(`/room/${safeEventId}`);
    try {
      localStorage.removeItem("eventId");
      localStorage.removeItem("amount");
    } catch {
      /* ignore */
    }
    return;
  }

  router.replace("/");
}
