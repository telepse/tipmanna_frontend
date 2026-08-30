import { isIosSafariNonStandalone } from "@/lib/pwa-utils";

const STORAGE_KEY = "pending_push_opt_in";

export type PendingPushOptIn = {
  requestedAt: string;
  source?: string;
};

export function setPendingPushOptIn(source?: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingPushOptIn = {
      requestedAt: new Date().toISOString(),
      ...(source ? { source } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearPendingPushOptIn(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readPendingPushOptIn(): PendingPushOptIn | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPushOptIn;
    return parsed?.requestedAt ? parsed : null;
  } catch {
    return null;
  }
}

/** iOS Safari tab must install PWA before requesting push permission. */
export function shouldDeferPushUntilInstalled(): boolean {
  return isIosSafariNonStandalone();
}
