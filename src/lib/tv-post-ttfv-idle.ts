/**
 * Schedule non-critical TV work after first video play or idle timeout.
 * Used to keep catalog/tips prefetch off the TTFV critical path.
 */

let firstPlaySeen = false;
const idleQueue: Array<() => void> = [];

function runIdleQueue(): void {
  const batch = idleQueue.splice(0, idleQueue.length);
  for (const fn of batch) {
    try {
      fn();
    } catch (err) {
      console.error("[tv-post-ttfv-idle]", err);
    }
  }
}

/** Call once from TvPlayer onPlay (via provider) to flush deferred work. */
export function notifyTvFirstPlay(): void {
  if (firstPlaySeen) return;
  firstPlaySeen = true;
  runIdleQueue();
}

/** Queue work until first onPlay or idle timeout (whichever comes first). */
export function schedulePostTtfvIdle(
  fn: () => void,
  opts?: { timeoutMs?: number }
): void {
  if (typeof window === "undefined") return;
  if (firstPlaySeen) {
    fn();
    return;
  }

  idleQueue.push(fn);
  const timeoutMs = opts?.timeoutMs ?? 4000;

  const flush = () => {
    if (firstPlaySeen) return;
    runIdleQueue();
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => flush(), { timeout: timeoutMs });
  } else {
    window.setTimeout(flush, timeoutMs);
  }
}

/** Test-only reset */
export function resetTvPostTtfvIdleForTests(): void {
  firstPlaySeen = false;
  idleQueue.length = 0;
}
