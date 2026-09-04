"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  readPendingPaymentReturn,
  type PendingPaymentReturnV1,
} from "@/lib/pending-payment-return";
import { isCurrentRoutePaymentOrigin } from "@/lib/payment-recovery-exchange";
import { persistReelSoundPref, readSessionMuted } from "@/lib/session-audio";
import type { VideoPlayerRef } from "@/components/events/video-player";

export type PaymentPlaybackRestoreSnapshot = {
  channelId: string | null;
  offsetSec: number;
  wasMuted: boolean;
  capture: "drawer_open" | "payment_intent";
};

type Options = {
  enabled?: boolean;
  paymentSurface: string | string[];
  videoRef: RefObject<VideoPlayerRef | null>;
  currentChannelId: string | null | undefined;
  onMuteChange?: (muted: boolean) => void;
};

function surfaceMatches(
  pending: PendingPaymentReturnV1,
  allowed: string[]
): boolean {
  return allowed.includes(pending.paymentSurface);
}

function applyRestore(
  player: VideoPlayerRef,
  pending: PendingPaymentReturnV1,
  onMuteChange?: (muted: boolean) => void
): void {
  const offset = Math.max(0, pending.restoreOffsetSec ?? 0);
  const wasMuted = pending.restoreWasMuted ?? readSessionMuted();
  player.seekTo(offset);
  player.play();
  if (wasMuted) {
    player.mute();
    onMuteChange?.(true);
  } else {
    player.unmute();
    persistReelSoundPref(true);
    onMuteChange?.(false);
  }
}

/**
 * After Stripe redirect return, seek the surface video to the persisted snapshot and resume playback + audio.
 */
export function usePaymentPlaybackRestore({
  enabled = true,
  paymentSurface,
  videoRef,
  currentChannelId,
  onMuteChange,
}: Options): void {
  const restoredTxRef = useRef<string | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const allowedSurfaces = useMemo(
    () => (Array.isArray(paymentSurface) ? paymentSurface : [paymentSurface]),
    [paymentSurface]
  );

  useEffect(() => {
    if (!enabled) return;

    const attemptRestore = () => {
      const pending = readPendingPaymentReturn();
      if (!pending?.isRedirectPayment) return;
      if (!surfaceMatches(pending, allowedSurfaces)) return;
      if (!isCurrentRoutePaymentOrigin(pending.paymentOrigin)) return;
      if (
        pending.restoreChannelId == null ||
        pending.restoreOffsetSec == null
      ) {
        return;
      }
      if (restoredTxRef.current === pending.transactionId) return;
      if (String(currentChannelId ?? "") !== String(pending.restoreChannelId)) {
        return;
      }

      const player = videoRef.current;
      if (!player?.isReady()) {
        retryTimerRef.current = window.setTimeout(attemptRestore, 150);
        return;
      }

      restoredTxRef.current = pending.transactionId;
      applyRestore(player, pending, onMuteChange);
    };

    attemptRestore();

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [enabled, allowedSurfaces, currentChannelId, videoRef, onMuteChange]);
}
