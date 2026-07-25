"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  createAnimationQueue,
  type AnimationQueueTask,
  type EnqueueResult,
} from "@/lib/animation-queue-core";

export type { AnimationQueueTask, EnqueueResult };
export { MAX_QUEUED_BATCHES } from "@/lib/animation-queue-core";

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
  enqueue: (tasks: AnimationQueueTask[]) => EnqueueResult;
  flush: () => void;
}

export function useAnimationQueue({
  eventId,
  enabled = true,
  surface,
}: UseAnimationQueueOptions): UseAnimationQueueReturn {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const queue = useMemo(
    () =>
      createAnimationQueue({
        eventId,
        getEnabled: () => enabledRef.current,
        surface,
      }),
    [eventId, surface]
  );

  const enqueue = useCallback(
    (tasks: AnimationQueueTask[]) => queue.enqueue(tasks),
    [queue]
  );

  const flush = useCallback(() => queue.flush(), [queue]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return () => {
      flush();
    };
  }, [eventId, flush, enabled]);

  return { enqueue, flush };
}
