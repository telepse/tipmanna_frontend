"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { RoomCharacter } from "@/types";
import { useAnimationQueue } from "@/hooks/use-animation-queue";
import { isPayerOriginRecoveryEnabled } from "@/lib/payer-origin-recovery-flag";
import {
  readPendingPaymentReturn,
  clearPendingPaymentReturn,
} from "@/lib/pending-payment-return";
import {
  readPaymentRecoverySession,
  markPaymentRecoverySessionCompleted,
  clearPaymentRecoverySession,
} from "@/lib/payment-recovery-session";
import {
  claimRecoveryOccurrencesRequest,
  renewRecoveryClaimRequest,
  reportRecoveryProgressRequest,
  RecoveryApiError,
  traceRecoveryApiError,
  type OccurrenceProgressRow,
} from "@/lib/payment-recovery-client";
import { enqueuePayerOriginRecoveryBundle } from "@/lib/enqueue-payer-origin-recovery";
import { tryPayerLocalAnimationFallback } from "@/lib/payer-local-animation-fallback";
import {
  isCurrentRoutePaymentOrigin,
  normalizePaymentOriginUrl,
} from "@/lib/payment-recovery-exchange";
import { isPaymentPendingReturn } from "@/lib/tv-payment-snapshot";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import type { RealtimeSurface } from "@/lib/realtime-telemetry";
import { SCREEN_DISPLAY_PLAYBACK_PREFIX } from "@/lib/payment-playback-key";

const LEASE_RENEW_INTERVAL_MS = 30_000;
const PUSHER_GRACE_MS = 400;
const MAX_IMMEDIATE_RETRY = 2;

export interface UsePayerOriginAnimationRecoveryOptions {
  eventId: string;
  /** Surface id(s) written to pending return at PaymentIntent creation. */
  paymentSurface: string | string[];
  characters: RoomCharacter[];
  enabled?: boolean;
  animationMount?: RefObject<HTMLElement | null>;
  surface: RealtimeSurface;
  playbackKeyPrefix?: string;
}

/**
 * Payer-origin recovery fallback — mounts only on supported payment surfaces.
 * Never touches monotonic guard, validated-tip dispatch, or Screen Display.
 */
export function usePayerOriginAnimationRecovery({
  eventId,
  paymentSurface,
  characters,
  enabled = true,
  animationMount,
  surface,
  playbackKeyPrefix = "",
}: UsePayerOriginAnimationRecoveryOptions): void {
  const startedTransactionIdRef = useRef<string | null>(null);
  const recoveryInFlightRef = useRef<string | null>(null);
  const claimMadeRef = useRef(false);
  const renewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const claimIdRef = useRef<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const pendingReportsRef = useRef<OccurrenceProgressRow[]>([]);

  const allowedSurfaces = useMemo(
    () => (Array.isArray(paymentSurface) ? paymentSurface : [paymentSurface]),
    [paymentSurface]
  );
  const surfaceKey = useMemo(
    () => allowedSurfaces.slice().sort().join("|"),
    [allowedSurfaces]
  );
  const paymentSurfaceRef = useRef(allowedSurfaces);
  paymentSurfaceRef.current = allowedSurfaces;

  const eventIdRef = useRef(eventId);
  eventIdRef.current = eventId;

  const animationMountRef = useRef(animationMount);
  animationMountRef.current = animationMount;

  const playbackKeyPrefixRef = useRef(playbackKeyPrefix);
  playbackKeyPrefixRef.current = playbackKeyPrefix;

  const characterMapRef = useRef(new Map<string, RoomCharacter>());
  characterMapRef.current = new Map(characters.map(c => [c.name, c]));

  const catalogKey = useMemo(
    () => `${characters.length}:${characters[0]?.id ?? ""}`,
    [characters]
  );

  const queueKey = eventId || "__no-event__";
  const { enqueue } = useAnimationQueue({
    eventId: queueKey,
    enabled,
    surface,
  });
  const enqueueRef = useRef(enqueue);
  enqueueRef.current = enqueue;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !enabled ||
      !isPayerOriginRecoveryEnabled()
    ) {
      return;
    }

    if (playbackKeyPrefixRef.current === SCREEN_DISPLAY_PLAYBACK_PREFIX) {
      return;
    }

    const pending = readPendingPaymentReturn();
    const session = readPaymentRecoverySession();
    const fallbackOnly = Boolean(pending?.recoveryUnavailable && !session);

    if (!pending) {
      return;
    }
    if (session?.recoveryCompleted) {
      return;
    }
    if (!fallbackOnly && !session) {
      return;
    }
    if (!pending.isRedirectPayment) {
      return;
    }
    if (!paymentSurfaceRef.current.includes(pending.paymentSurface)) {
      return;
    }
    if (pending.eventId.trim() !== eventIdRef.current.trim()) {
      return;
    }
    if (!fallbackOnly) {
      if (!session || session.transactionId !== pending.transactionId) {
        return;
      }
      if (!isPaymentPendingReturn() && !session.sessionToken) {
        return;
      }
    }
    if (startedTransactionIdRef.current === pending.transactionId) {
      return;
    }
    if (recoveryInFlightRef.current === pending.transactionId) {
      return;
    }
    if (!isCurrentRoutePaymentOrigin(pending.paymentOrigin)) {
      return;
    }

    const catalogReady = fallbackOnly || characters.length > 0;
    if (!catalogReady) {
      return;
    }

    const pendingSurface = pending.paymentSurface;
    const transactionId = pending.transactionId;

    tracePaymentAnimation({
      stage: "payer_recovery_origin_detected",
      transactionId,
      eventId: pending.eventId,
      surface: pendingSurface,
    });

    recoveryInFlightRef.current = transactionId;
    claimMadeRef.current = false;
    sessionTokenRef.current = session?.sessionToken ?? null;

    let cancelled = false;

    const attemptLocalFallback = (): boolean => {
      const played = tryPayerLocalAnimationFallback({
        eventId: pending.eventId,
        transactionId,
        characterMap: characterMapRef.current,
        enqueue: enqueueRef.current,
        animationMount: animationMountRef.current?.current ?? undefined,
        playbackKeyPrefix: playbackKeyPrefixRef.current,
        surface,
      });
      if (played) {
        startedTransactionIdRef.current = transactionId;
        markPaymentRecoverySessionCompleted();
        clearPendingPaymentReturn();
        clearPaymentRecoverySession();
      }
      return played;
    };

    const finalizeRecoverySession = (claimId: string) => {
      markPaymentRecoverySessionCompleted();
      clearPendingPaymentReturn();
      clearPaymentRecoverySession();
      if (renewTimerRef.current) {
        clearInterval(renewTimerRef.current);
        renewTimerRef.current = null;
      }
      tracePaymentAnimation({
        stage: "payer_recovery_session_completed",
        transactionId,
        eventId: pending.eventId,
        claimId,
        surface: pendingSurface,
      });
    };

    const flushProgress = async (
      rows: OccurrenceProgressRow[],
      canonicalBundleId: string
    ) => {
      const token = sessionTokenRef.current;
      const claimId = claimIdRef.current;
      if (!token || !claimId || !rows.length) {
        return;
      }
      try {
        const result = await reportRecoveryProgressRequest(token, {
          transactionId,
          bundleId: canonicalBundleId,
          claimId,
          surface: pendingSurface,
          occurrences: rows,
        });
        if (result.deliveryComplete && claimId) {
          finalizeRecoverySession(claimId);
        }
      } catch (err) {
        traceRecoveryApiError("payer_recovery_occurrence_failed", err, {
          claimId,
        });
      }
    };

    const run = async () => {
      await new Promise(r => setTimeout(r, PUSHER_GRACE_MS));
      if (cancelled) return;

      if (fallbackOnly) {
        attemptLocalFallback();
        if (!claimMadeRef.current) {
          startedTransactionIdRef.current = null;
          recoveryInFlightRef.current = null;
        }
        return;
      }

      const token = sessionTokenRef.current;
      if (!token) {
        attemptLocalFallback();
        if (!claimMadeRef.current) {
          recoveryInFlightRef.current = null;
        }
        return;
      }

      let claimResult;
      try {
        claimResult = await claimRecoveryOccurrencesRequest(token);
      } catch (err) {
        traceRecoveryApiError("payer_recovery_claim_started", err);
        const isDefinitiveClaimFailure =
          err instanceof RecoveryApiError &&
          (err.kind === "forbidden" ||
            err.kind === "not_found" ||
            err.kind === "conflict" ||
            err.kind === "gone");
        if (isDefinitiveClaimFailure) {
          attemptLocalFallback();
        }
        if (!claimMadeRef.current) {
          startedTransactionIdRef.current = null;
          recoveryInFlightRef.current = null;
        }
        return;
      }

      if (cancelled) return;

      claimMadeRef.current = true;
      startedTransactionIdRef.current = transactionId;
      claimIdRef.current = claimResult.claimId;
      const bundleId =
        claimResult.canonicalPayload.id ??
        `${claimResult.canonicalPayload.eventId}-${claimResult.canonicalPayload.serverTs}`;

      const remaining = new Set(claimResult.remainingOccurrenceIds);
      const retryCounts = new Map<string, number>();

      const tryReport = async (row: OccurrenceProgressRow) => {
        pendingReportsRef.current.push(row);
        const batch = [...pendingReportsRef.current];
        pendingReportsRef.current = [];
        await flushProgress(
          batch.map(r => ({
            ...r,
            ...(r.playbackResult === "completed"
              ? {
                  cycle1Outcome: r.cycle1Outcome ?? "completed",
                  cycle2Outcome: r.cycle2Outcome ?? "completed",
                }
              : {}),
          })),
          bundleId
        );
      };

      const onOccurrenceFinished = (report: {
        occurrenceId: string;
        playbackResult: "completed" | "failed";
        cycle1Outcome?: string;
        cycle2Outcome?: string;
      }) => {
        if (report.playbackResult === "completed") {
          remaining.delete(report.occurrenceId);
          void tryReport({
            occurrenceId: report.occurrenceId,
            playbackResult: "completed",
            cycle1Outcome: report.cycle1Outcome,
            cycle2Outcome: report.cycle2Outcome,
          });
          return;
        }

        const retries = (retryCounts.get(report.occurrenceId) ?? 0) + 1;
        retryCounts.set(report.occurrenceId, retries);
        void tryReport({
          occurrenceId: report.occurrenceId,
          playbackResult: "failed",
          cycle1Outcome: report.cycle1Outcome,
          cycle2Outcome: report.cycle2Outcome,
        });

        if (retries <= MAX_IMMEDIATE_RETRY) {
          enqueuePayerOriginRecoveryBundle({
            canonicalPayload: claimResult.canonicalPayload,
            remainingOccurrenceIds: [report.occurrenceId],
            surface,
            claimId: claimResult.claimId,
            deliverySource: "payer_origin_recovery",
            bypassSegmentFreshness: true,
            animationMount: animationMountRef.current?.current ?? undefined,
            characterMap: characterMapRef.current,
            playbackKeyPrefix: playbackKeyPrefixRef.current,
            enqueue: enqueueRef.current,
            onOccurrenceFinished,
          });
        }
      };

      if (!claimResult.remainingOccurrenceIds.length) {
        finalizeRecoverySession(claimResult.claimId);
        return;
      }

      enqueuePayerOriginRecoveryBundle({
        canonicalPayload: claimResult.canonicalPayload,
        remainingOccurrenceIds: claimResult.remainingOccurrenceIds,
        surface,
        claimId: claimResult.claimId,
        deliverySource: "payer_origin_recovery",
        bypassSegmentFreshness: true,
        animationMount: animationMountRef.current?.current ?? undefined,
        characterMap: characterMapRef.current,
        playbackKeyPrefix: playbackKeyPrefixRef.current,
        enqueue: enqueueRef.current,
        onOccurrenceFinished,
      });

      renewTimerRef.current = setInterval(() => {
        const t = sessionTokenRef.current;
        const cId = claimIdRef.current;
        if (!t || !cId || cancelled) return;
        void renewRecoveryClaimRequest(t, cId).catch(err => {
          traceRecoveryApiError("payer_recovery_lease_renewed", err, {
            claimId: cId,
          });
        });
      }, LEASE_RENEW_INTERVAL_MS);
    };

    void run();

    return () => {
      cancelled = true;
      if (!claimMadeRef.current) {
        recoveryInFlightRef.current = null;
      }
      if (renewTimerRef.current) {
        clearInterval(renewTimerRef.current);
        renewTimerRef.current = null;
      }
    };
  }, [enabled, eventId, surfaceKey, surface, catalogKey]);
}

export { normalizePaymentOriginUrl };
