"use client";

import { useEffect, useRef, useCallback } from "react";
import { animLog, animWarn } from "@/lib/animationDebug";

const MAX_QUEUED_BATCHES = 20;

interface UseAnimationQueueOptions {
  eventId: string;
  enabled?: boolean;
}

interface UseAnimationQueueReturn {
  enqueue: (animations: (() => Promise<void>)[]) => void;
  flush: () => void;
}

export function useAnimationQueue({
  eventId,
  enabled = true,
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
  }, [eventId]);

  const enqueue = useCallback(
    (animations: (() => Promise<void>)[]) => {
      if (!enabledRef.current || animations.length === 0) return;

      if (pendingCountRef.current >= MAX_QUEUED_BATCHES) {
        animWarn(
          "[AnimQueue] max depth reached — dropping batch",
          animations.length,
          "animations"
        );
        return;
      }

      pendingCountRef.current++;
      const capturedGeneration = generationRef.current;
      const queues = eventQueuesRef.current;
      const previous = queues.get(eventId) ?? Promise.resolve();

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
          for (const run of animations) {
            if (generationRef.current !== capturedGeneration) {
              animWarn("[AnimQueue] generation mismatch — batch killed");
              return;
            }
            try {
              await run();
            } catch {
              // Never block the queue on animation failure
            }
          }
        })
        .finally(() => {
          pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
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
    [eventId]
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
