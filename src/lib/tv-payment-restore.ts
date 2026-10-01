export type PaymentRestoreModeDecision = "GLOBAL" | "LOCAL";

/** After successful payment, whether TV should re-enter GLOBAL live (not persisted mode alone). */
export function resolvePaymentRestoreMode(opts: {
  mode: "GLOBAL" | "LOCAL";
  originMode: "GLOBAL" | "LOCAL" | undefined;
  paymentSucceeded: boolean;
}): PaymentRestoreModeDecision {
  if (opts.mode === "GLOBAL") return "GLOBAL";
  if (opts.paymentSucceeded && opts.originMode === "GLOBAL") {
    return "GLOBAL";
  }
  return "LOCAL";
}

export type PendingPaymentLocalRestore = {
  scheduleIndex: number;
  videoId: string;
  currentTime: number;
  wasMuted: boolean;
  wasPlaying: boolean;
};

export function buildPendingPaymentLocalRestore(opts: {
  scheduleIndex: number;
  videoId: string;
  currentTime: number;
  wasMuted: boolean;
  wasPlaying: boolean;
}): PendingPaymentLocalRestore {
  return {
    scheduleIndex: opts.scheduleIndex,
    videoId: opts.videoId,
    currentTime: Math.max(0, opts.currentTime),
    wasMuted: opts.wasMuted,
    wasPlaying: opts.wasPlaying,
  };
}

export type PaymentLocalRestorePlan = "defer" | "load" | "seek";

/** Mirrors TvProvider pending payment LOCAL restore (testable). */
export function planPaymentLocalRestoreApply(opts: {
  pending: PendingPaymentLocalRestore | null;
  playerReady: boolean;
  orchestratedVideoId: string | null;
}): PaymentLocalRestorePlan {
  if (!opts.pending) return "defer";
  if (!opts.playerReady) return "defer";
  if (
    !opts.orchestratedVideoId ||
    opts.orchestratedVideoId !== opts.pending.videoId
  ) {
    return "load";
  }
  return "seek";
}
