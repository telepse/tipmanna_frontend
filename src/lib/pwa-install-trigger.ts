import { ANIMATION_DURATION } from "@/lib/animationContract";

export type PwaInstallTrigger = "engagement" | "payment";

export type PwaPreferenceSnapshot = {
  status?: string;
  paymentCount?: number;
  dismissCount?: number;
};

const ENGAGEMENT_MS = 5 * 60 * 1000;
const PAYMENT_ANIMATION_BUFFER_MS = 3500;
export const PWA_ENGAGEMENT_MS = ENGAGEMENT_MS;
export const PWA_PENDING_PAYMENT_KEY = "pwa_pending_payment_prompt";
export const PWA_ENGAGEMENT_ELAPSED_KEY = "pwa_engagement_elapsed_ms";
export const PWA_ENGAGEMENT_FIRED_KEY = "pwa_engagement_fired";

type PwaPromptListener = (trigger: PwaInstallTrigger) => void;
type PwaPreferenceRefreshListener = () => void;

const listeners = new Set<PwaPromptListener>();
const preferenceRefreshListeners = new Set<PwaPreferenceRefreshListener>();

export function subscribePwaPrompt(listener: PwaPromptListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribePwaPreferenceRefresh(
  listener: PwaPreferenceRefreshListener
): () => void {
  preferenceRefreshListeners.add(listener);
  return () => preferenceRefreshListeners.delete(listener);
}

export function notifyPwaPreferenceRefresh(): void {
  for (const listener of preferenceRefreshListeners) {
    listener();
  }
}

export function requestPwaPrompt(trigger: PwaInstallTrigger): void {
  for (const listener of listeners) {
    listener(trigger);
  }
}

/** Fired a few seconds after the payment tip animation window completes. */
export function signalPaymentAnimationComplete(): void {
  requestPwaPrompt("payment");
}

/** Schedule PWA prompt after the standard payment animation window. */
export function schedulePwaPromptAfterPaymentAnimation(
  characterCount = 1
): void {
  if (typeof window === "undefined") return;
  const delay =
    ANIMATION_DURATION.payment.max * Math.max(1, characterCount) +
    PAYMENT_ANIMATION_BUFFER_MS;
  window.setTimeout(() => signalPaymentAnimationComplete(), delay);
}

export function isPwaAutoPromptSuppressed(
  pref: PwaPreferenceSnapshot | null | undefined,
  installed: boolean
): boolean {
  if (installed) return true;
  const status = pref?.status;
  return status === "installed" || status === "do_not_show";
}

export function shouldShowManualInstallAffordance(
  pref: PwaPreferenceSnapshot | null | undefined,
  installed: boolean
): boolean {
  if (installed) return false;
  const status = pref?.status;
  if (status === "do_not_show") return true;
  if (status === "dismissed") return true;
  return (pref?.dismissCount ?? 0) >= 1;
}

export function markPendingPaymentPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_PENDING_PAYMENT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumePendingPaymentPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = sessionStorage.getItem(PWA_PENDING_PAYMENT_KEY);
    if (!v) return false;
    sessionStorage.removeItem(PWA_PENDING_PAYMENT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function readEngagementElapsedMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(PWA_ENGAGEMENT_ELAPSED_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeEngagementElapsedMs(ms: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_ENGAGEMENT_ELAPSED_KEY, String(Math.max(0, ms)));
  } catch {
    /* ignore */
  }
}

export function hasEngagementFiredThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PWA_ENGAGEMENT_FIRED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markEngagementFiredThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_ENGAGEMENT_FIRED_KEY, "1");
  } catch {
    /* ignore */
  }
}
