"use client";

import { useEffect, useRef, useCallback } from "react";
import { animLog, animWarn } from "@/lib/animationDebug";
import {
  tracePaymentAnimation,
  tracePaymentAnimationError,
} from "@/lib/payment-animation-trace";

const MAX_QUEUED_BATCHES = 20;

interface UseAnimationQueueOptions {
  eventId: string;
  enabled?: boolean;
  /** Diagnostics only — does not affect queue behaviour. */
  surface?: string;
  /** Diagnostics only — bundle metadata for trace correlation. */
  bundleId?: string;
  seq?: number;
}

interface UseAnimationQueueReturn {
  enqueue: (animations: (() => Promise<void>)[]) => void;
  flush: () => void;
}

export function useAnimationQueue({
  eventId,
  enabled = true,
  surface,
}: UseAnimationQueueOptions): UseAnimationQueueReturn {
  const eventQueuesRef = useRef(new Map<string, Promise<void>>());
  const generationRef = useRef(0);
  const pendingCountRef = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const flush = useCallback(() => {
    generationRef.current++;
    eventQueuesRef.current.set(eventId, Promise.resolve());
    pendingCountRef.current = 0;
    tracePaymentAnimation({
      stage: "queue_generation_invalidated",
      surface,
      eventId,
      currentGeneration: generationRef.current,
      queueEnabled: enabledRef.current,
    });
    tracePaymentAnimation({
      stage: "queue_flushed",
      surface,
      eventId,
      queuePendingCount: 0,
      currentGeneration: generationRef.current,
      queueEnabled: enabledRef.current,
    });
  }, [eventId, surface]);

  const enqueue = useCallback(
    (animations: (() => Promise<void>)[]) => {
      tracePaymentAnimation({
        stage: "queue_batch_offered",
        surface,
        eventId,
        taskCount: animations.length,
        queuePendingCount: pendingCountRef.current,
        maxBatchCount: MAX_QUEUED_BATCHES,
        queueEnabled: enabledRef.current,
        currentGeneration: generationRef.current,
      });

      if (!enabledRef.current || animations.length === 0) {
        tracePaymentAnimation({
          stage: "queue_batch_rejected_disabled",
          surface,
          eventId,
          taskCount: animations.length,
          queueEnabled: enabledRef.current,
          rejectionReason: !enabledRef.current ? "disabled" : "empty_batch",
        });
        return;
      }

      if (pendingCountRef.current >= MAX_QUEUED_BATCHES) {
        animWarn(
          "[AnimQueue] max depth reached — dropping batch",
          animations.length,
          "animations"
        );
        tracePaymentAnimation({
          stage: "queue_batch_rejected_full",
          surface,
          eventId,
          taskCount: animations.length,
          queuePendingCount: pendingCountRef.current,
          maxBatchCount: MAX_QUEUED_BATCHES,
          queueEnabled: enabledRef.current,
          rejectionReason: "queue_full",
        });
        return;
      }

      pendingCountRef.current++;
      tracePaymentAnimation({
        stage: "queue_batch_pending_incremented",
        surface,
        eventId,
        taskCount: animations.length,
        queuePendingCount: pendingCountRef.current,
        maxBatchCount: MAX_QUEUED_BATCHES,
        queueEnabled: enabledRef.current,
      });

      const capturedGeneration = generationRef.current;
      const queues = eventQueuesRef.current;
      const previous = queues.get(eventId) ?? Promise.resolve();

      tracePaymentAnimation({
        stage: "queue_batch_accepted",
        surface,
        eventId,
        taskCount: animations.length,
        queuePendingCount: pendingCountRef.current,
        capturedGeneration,
        currentGeneration: generationRef.current,
        queueEnabled: enabledRef.current,
      });

      animLog(
        "[AnimQueue] enqueue",
        animations.length,
        "anims, gen:",
        capturedGeneration,
        "pending:",
        pendingCountRef.current
      );

      const next = previous
        .then(async () => {
          tracePaymentAnimation({
            stage: "queue_batch_started",
            surface,
            eventId,
            taskCount: animations.length,
            capturedGeneration,
            currentGeneration: generationRef.current,
            queueEnabled: enabledRef.current,
          });

          for (const run of animations) {
            if (generationRef.current !== capturedGeneration) {
              animWarn("[AnimQueue] generation mismatch — batch killed");
              tracePaymentAnimation({
                stage: "queue_batch_aborted_generation",
                surface,
                eventId,
                capturedGeneration,
                currentGeneration: generationRef.current,
                queueEnabled: enabledRef.current,
              });
              return;
            }
            tracePaymentAnimation({
              stage: "queue_task_started",
              surface,
              eventId,
              capturedGeneration,
              currentGeneration: generationRef.current,
              queueEnabled: enabledRef.current,
            });
            try {
              await run();
              tracePaymentAnimation({
                stage: "queue_task_completed",
                surface,
                eventId,
                capturedGeneration,
                currentGeneration: generationRef.current,
                queueEnabled: enabledRef.current,
              });
            } catch (err) {
              tracePaymentAnimationError("queue_task_failed", err, {
                surface,
                eventId,
                capturedGeneration,
                currentGeneration: generationRef.current,
                queueEnabled: enabledRef.current,
              });
              // Never block the queue on animation failure
            }
          }

          tracePaymentAnimation({
            stage: "queue_advanced",
            surface,
            eventId,
            capturedGeneration,
            currentGeneration: generationRef.current,
            queueEnabled: enabledRef.current,
          });
        })
        .finally(() => {
          pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
          tracePaymentAnimation({
            stage: "queue_batch_pending_decremented",
            surface,
            eventId,
            queuePendingCount: pendingCountRef.current,
            capturedGeneration,
            currentGeneration: generationRef.current,
            queueEnabled: enabledRef.current,
          });
          queueMicrotask(() => {
            const queuesMap = eventQueuesRef.current;
            if (
              queuesMap.get(eventId) === next &&
              pendingCountRef.current === 0
            ) {
              queuesMap.delete(eventId);
            }
          });
        });

      queues.set(eventId, next);
    },
    [eventId, surface]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const queues = eventQueuesRef.current;
    const eid = eventId;
    return () => {
      flush();
      queues.delete(eid);
    };
  }, [eventId, flush, enabled]);

  return { enqueue, flush };
}
