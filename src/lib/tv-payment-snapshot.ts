/** UI-only slot for full-schedule highlight (drawer); not the same as `currentIndex` when playing alternate-batch override. */
export type SchedulePlayingSlot =
  | {
      scope: "active";
      rowIndex: number;
      /** `preview` = preview playlist click (re-pin list). `schedule` = full schedule drawer (preserve scroll). */
      source?: "preview" | "schedule";
    }
  | { scope: "alternate"; rowIndex: number };

export const TV_PAYMENT_SNAPSHOT_KEY = "tv_payment_snapshot_v1";

/** Set when tip flow may leave the page (Stripe); cleared on resume or after hydrate. */
export const TV_PAYMENT_PENDING_RETURN_KEY = "tv_payment_pending_return";

export type PersistedTvPaymentSnapshot = {
  v: 1;
  mode: "GLOBAL" | "LOCAL";
  currentIndex: number;
  currentTime: number;
  wasPlaying: boolean;
  wasMuted: boolean;
  playingItemOverrideId: string | null;
  schedulePlayingSlot: SchedulePlayingSlot | null;
  localModeReason: string | null;
};

export function writePersistedPaymentSnapshot(
  snap: PersistedTvPaymentSnapshot
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TV_PAYMENT_SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

export function readPersistedPaymentSnapshot(): PersistedTvPaymentSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TV_PAYMENT_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTvPaymentSnapshot;
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersistedPaymentSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TV_PAYMENT_SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}

export function setPaymentPendingReturn(pending: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (pending) {
      sessionStorage.setItem(TV_PAYMENT_PENDING_RETURN_KEY, "1");
    } else {
      sessionStorage.removeItem(TV_PAYMENT_PENDING_RETURN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function isPaymentPendingReturn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(TV_PAYMENT_PENDING_RETURN_KEY) === "1";
  } catch {
    return false;
  }
}
