export type AnimationMode = "preview" | "payment";

export interface AnimationHandle {
  /** Optional imperative start hook used by some preview / legacy paths */
  start?: () => void;
  stop: () => void;
  finished: Promise<void>;
  /** Optional DOM root (e.g. TV layer reparenting). Most styles mount to body directly. */
  rootElement?: HTMLElement;
}

export const ANIMATION_DURATION = {
  preview: {
    min: 3000,
    max: 4000,
    default: 3500,
  },
  payment: {
    min: 8000,
    max: 10000,
    default: 9000,
  },
} as const;

/**
 * Realtime tip-animation guard — keep in sync with
 * `backend/src/constants/animation-contract.ts` → `guard.staleThresholdMs`.
 */
export const REALTIME_GUARD = {
  staleThresholdMs: 180_000,
} as const;

/** Payment wrap gaps — keep in sync with backend `wrapPayment` + wrapPaymentAnimation.ts */
export const PAYMENT_WRAP = {
  betweenCyclesMs: 380,
  secondCycleBeatMs: 95,
  safetyTimeoutMs: ANIMATION_DURATION.payment.max + 5_000,
} as const;
