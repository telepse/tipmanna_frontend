import { ANIMATION_DURATION } from "@/lib/animationContract";

export type PwaInstallTrigger = "landing" | "payment" | "engagement" | "dwell";

export type PromptPolicySnapshot = {
  enabled: boolean;
  publishedAt: string | null;
  landingDelaySec: number;
  secondPromptEnabled: boolean;
  afterPaymentEnabled: boolean;
  afterPaymentDelaySec: number;
  afterEngagementEnabled: boolean;
  afterEngagementDelaySec: number;
  afterDwellMinutes: number;
  pwaInstalledOnly: boolean;
};

export type PwaPreferenceSnapshot = {
  status?: string;
  paymentCount?: number;
  dismissCount?: number;
};

export const PWA_PROMPT_A_KEY = "pwa_prompt_a_fired";
export const PWA_PROMPT_B_KEY = "pwa_prompt_b_fired";
export const PWA_DWELL_MS_KEY = "pwa_dwell_elapsed_ms";

const PAYMENT_ANIMATION_BUFFER_MS = 3500;

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

export function isDashboardPath(pathname: string): boolean {
  return (
    pathname.startsWith("/host") ||
    pathname.startsWith("/co-owner") ||
    pathname.startsWith("/partner")
  );
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

export function hasPromptAFiredThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PWA_PROMPT_A_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPromptAFiredThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_PROMPT_A_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasPromptBFiredThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PWA_PROMPT_B_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPromptBFiredThisSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_PROMPT_B_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function readDwellElapsedMs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(PWA_DWELL_MS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeDwellElapsedMs(ms: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_DWELL_MS_KEY, String(Math.max(0, ms)));
  } catch {
    /* ignore */
  }
}

/** Schedule second-slot prompt after payment animation completes. */
export function schedulePwaPromptAfterPaymentAnimation(
  characterCount = 1,
  delaySec = 20
): void {
  if (typeof window === "undefined") return;
  const delay =
    ANIMATION_DURATION.payment.max * Math.max(1, characterCount) +
    PAYMENT_ANIMATION_BUFFER_MS +
    delaySec * 1000;
  window.setTimeout(() => requestPwaPrompt("payment"), delay);
}

export function scheduleEngagementPwaPrompt(delaySec = 20): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => requestPwaPrompt("engagement"), delaySec * 1000);
}

export async function schedulePwaPromptAfterPaymentWithPolicy(
  characterCount = 1
): Promise<void> {
  const policy = await fetchPwaPromptPolicy();
  if (!policy.afterPaymentEnabled) return;
  schedulePwaPromptAfterPaymentAnimation(
    characterCount,
    policy.afterPaymentDelaySec
  );
}

export async function scheduleEngagementPwaPromptFromPolicy(): Promise<void> {
  const policy = await fetchPwaPromptPolicy();
  if (!policy.afterEngagementEnabled) return;
  scheduleEngagementPwaPrompt(policy.afterEngagementDelaySec);
}

const DEFAULT_PWA_POLICY: PromptPolicySnapshot = {
  enabled: false,
  publishedAt: null,
  landingDelaySec: 60,
  secondPromptEnabled: true,
  afterPaymentEnabled: true,
  afterPaymentDelaySec: 20,
  afterEngagementEnabled: true,
  afterEngagementDelaySec: 20,
  afterDwellMinutes: 20,
  pwaInstalledOnly: false,
};

let cachedPolicy: PromptPolicySnapshot | null = null;
let policyFetchedAt = 0;

export async function fetchPwaPromptPolicy(): Promise<PromptPolicySnapshot> {
  const now = Date.now();
  if (cachedPolicy && now - policyFetchedAt < 60_000) {
    return cachedPolicy;
  }
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  try {
    const r = await fetch(`${base}/prompt-policy`, { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { pwa?: PromptPolicySnapshot };
      cachedPolicy = j.pwa ?? DEFAULT_PWA_POLICY;
      policyFetchedAt = now;
      return cachedPolicy;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PWA_POLICY;
}

export async function fetchPushPromptPolicy(): Promise<PromptPolicySnapshot> {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "";
  try {
    const r = await fetch(`${base}/prompt-policy`, { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { push?: PromptPolicySnapshot };
      return j.push ?? { ...DEFAULT_PWA_POLICY, enabled: false };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PWA_POLICY, enabled: false };
}
