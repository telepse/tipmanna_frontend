import { animLog, animWarn } from "@/lib/animationDebug";
import {
  commitPlaybackKey,
  releasePlaybackKey,
  type PlaybackKeyTraceMeta,
} from "@/lib/playback-key-lifecycle";
import {
  tracePaymentAnimation,
  tracePaymentAnimationError,
} from "@/lib/payment-animation-trace";

export const MAX_QUEUED_BATCHES = 20;

export interface AnimationQueueTask {
  run: () => Promise<void>;
  playbackKey: string;
  traceMeta?: PlaybackKeyTraceMeta;
}

export type EnqueueResult =
  | { accepted: true }
  | { accepted: false; reason: "disabled" | "full" | "empty_batch" };

interface BatchRecord {
  tasks: AnimationQueueTask[];
  /** Index of the last task that committed; -1 when none have started. */
  committedThroughIndex: number;
}

export interface AnimationQueue {
  enqueue: (tasks: AnimationQueueTask[]) => EnqueueResult;
  flush: () => void;
  getPendingCount: () => number;
  getGeneration: () => number;
}

export function createAnimationQueue(options: {
  eventId: string;
  getEnabled: () => boolean;
  surface?: string;
}): AnimationQueue {
  const { eventId, getEnabled, surface } = options;

  let generation = 0;
  let pendingCount = 0;
  const eventQueues = new Map<string, Promise<void>>();
  const batchRecords = new Set<BatchRecord>();

  function releasePendingTaskKeys(
    batch: BatchRecord,
    fromIndex: number,
    reason: "generation_abort" | "flush"
  ): void {
    for (let i = fromIndex; i < batch.tasks.length; i++) {
      const task = batch.tasks[i];
      if (i <= batch.committedThroughIndex) continue;
      releasePlaybackKey(task.playbackKey, reason, {
        ...task.traceMeta,
        queueGeneration: generation,
      });
    }
  }

  function flush(): void {
    generation++;
    for (const batch of batchRecords) {
      releasePendingTaskKeys(batch, batch.committedThroughIndex + 1, "flush");
    }
    eventQueues.set(eventId, Promise.resolve());
    pendingCount = 0;
    tracePaymentAnimation({
      stage: "queue_generation_invalidated",
      surface,
      eventId,
      currentGeneration: generation,
      queueEnabled: getEnabled(),
    });
    tracePaymentAnimation({
      stage: "queue_flushed",
      surface,
      eventId,
      queuePendingCount: 0,
      currentGeneration: generation,
      queueEnabled: getEnabled(),
    });
  }

  function enqueue(tasks: AnimationQueueTask[]): EnqueueResult {
    tracePaymentAnimation({
      stage: "queue_batch_offered",
      surface,
      eventId,
      taskCount: tasks.length,
      queuePendingCount: pendingCount,
      maxBatchCount: MAX_QUEUED_BATCHES,
      queueEnabled: getEnabled(),
      currentGeneration: generation,
    });

    if (!getEnabled() || tasks.length === 0) {
      const rejectionReason = !getEnabled() ? "disabled" : "empty_batch";
      tracePaymentAnimation({
        stage: "queue_batch_rejected_disabled",
        surface,
        eventId,
        taskCount: tasks.length,
        queueEnabled: getEnabled(),
        rejectionReason,
      });
      for (const task of tasks) {
        releasePlaybackKey(task.playbackKey, "queue_disabled", task.traceMeta);
      }
      return {
        accepted: false,
        reason: tasks.length === 0 ? "empty_batch" : "disabled",
      };
    }

    if (pendingCount >= MAX_QUEUED_BATCHES) {
      animWarn(
        "[AnimQueue] max depth reached — dropping batch",
        tasks.length,
        "animations"
      );
      tracePaymentAnimation({
        stage: "queue_batch_rejected_full",
        surface,
        eventId,
        taskCount: tasks.length,
        queuePendingCount: pendingCount,
        maxBatchCount: MAX_QUEUED_BATCHES,
        queueEnabled: getEnabled(),
        rejectionReason: "queue_full",
      });
      for (const task of tasks) {
        releasePlaybackKey(task.playbackKey, "queue_full", task.traceMeta);
      }
      return { accepted: false, reason: "full" };
    }

    pendingCount++;
    tracePaymentAnimation({
      stage: "queue_batch_pending_incremented",
      surface,
      eventId,
      taskCount: tasks.length,
      queuePendingCount: pendingCount,
      maxBatchCount: MAX_QUEUED_BATCHES,
      queueEnabled: getEnabled(),
    });

    const capturedGeneration = generation;
    const batch: BatchRecord = {
      tasks,
      committedThroughIndex: -1,
    };
    batchRecords.add(batch);

    const previous = eventQueues.get(eventId) ?? Promise.resolve();

    tracePaymentAnimation({
      stage: "queue_batch_accepted",
      surface,
      eventId,
      taskCount: tasks.length,
      queuePendingCount: pendingCount,
      capturedGeneration,
      currentGeneration: generation,
      queueEnabled: getEnabled(),
    });

    animLog(
      "[AnimQueue] enqueue",
      tasks.length,
      "anims, gen:",
      capturedGeneration,
      "pending:",
      pendingCount
    );

    const next = previous
      .then(async () => {
        tracePaymentAnimation({
          stage: "queue_batch_started",
          surface,
          eventId,
          taskCount: tasks.length,
          capturedGeneration,
          currentGeneration: generation,
          queueEnabled: getEnabled(),
        });

        for (let taskIndex = 0; taskIndex < tasks.length; taskIndex++) {
          const task = tasks[taskIndex];
          if (generation !== capturedGeneration) {
            animWarn("[AnimQueue] generation mismatch — batch killed");
            tracePaymentAnimation({
              stage: "queue_batch_aborted_generation",
              surface,
              eventId,
              capturedGeneration,
              currentGeneration: generation,
              queueEnabled: getEnabled(),
            });
            releasePendingTaskKeys(batch, taskIndex, "generation_abort");
            return;
          }

          tracePaymentAnimation({
            stage: "queue_task_started",
            surface,
            eventId,
            capturedGeneration,
            currentGeneration: generation,
            queueEnabled: getEnabled(),
            playbackKey: task.playbackKey,
            characterName: task.traceMeta?.characterName,
          });

          commitPlaybackKey(task.playbackKey, {
            ...task.traceMeta,
            queueGeneration: capturedGeneration,
          });
          batch.committedThroughIndex = taskIndex;

          try {
            await task.run();
            tracePaymentAnimation({
              stage: "queue_task_completed",
              surface,
              eventId,
              capturedGeneration,
              currentGeneration: generation,
              queueEnabled: getEnabled(),
              playbackKey: task.playbackKey,
              characterName: task.traceMeta?.characterName,
            });
          } catch (err) {
            tracePaymentAnimationError("queue_task_failed", err, {
              surface,
              eventId,
              capturedGeneration,
              currentGeneration: generation,
              queueEnabled: getEnabled(),
              playbackKey: task.playbackKey,
              characterName: task.traceMeta?.characterName,
            });
          }
        }

        tracePaymentAnimation({
          stage: "queue_advanced",
          surface,
          eventId,
          capturedGeneration,
          currentGeneration: generation,
          queueEnabled: getEnabled(),
        });
      })
      .finally(() => {
        batchRecords.delete(batch);
        pendingCount = Math.max(0, pendingCount - 1);
        tracePaymentAnimation({
          stage: "queue_batch_pending_decremented",
          surface,
          eventId,
          queuePendingCount: pendingCount,
          capturedGeneration,
          currentGeneration: generation,
          queueEnabled: getEnabled(),
        });
        queueMicrotask(() => {
          if (eventQueues.get(eventId) === next && pendingCount === 0) {
            eventQueues.delete(eventId);
          }
        });
      });

    eventQueues.set(eventId, next);
    return { accepted: true };
  }

  return {
    enqueue,
    flush,
    getPendingCount: () => pendingCount,
    getGeneration: () => generation,
  };
}
