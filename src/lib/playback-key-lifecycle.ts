import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

export type PlaybackKeyState = "unseen" | "reserved" | "committed";

export type PlaybackKeyReleaseReason =
  | "queue_disabled"
  | "queue_full"
  | "generation_abort"
  | "flush";

export interface PlaybackKeyTraceMeta {
  surface?: string;
  eventId?: string;
  bundleId?: string;
  seq?: number;
  characterName?: string;
  styleName?: string;
  queueGeneration?: number;
}

const playbackKeyStates = new Map<string, "reserved" | "committed">();
const committedOrder: string[] = [];
const MAX_COMMITTED_ENTRIES = 500;

function traceStateChange(
  stage: string,
  key: string,
  previousState: PlaybackKeyState,
  resultingState: PlaybackKeyState,
  meta?: PlaybackKeyTraceMeta
): void {
  tracePaymentAnimation({
    stage,
    playbackKey: key,
    previousState,
    resultingState,
    surface: meta?.surface,
    eventId: meta?.eventId,
    bundleId: meta?.bundleId,
    seq: meta?.seq,
    characterName: meta?.characterName,
    styleName: meta?.styleName,
    queueGeneration: meta?.queueGeneration,
  });
}

export function getPlaybackKeyState(key: string): PlaybackKeyState {
  return playbackKeyStates.get(key) ?? "unseen";
}

/** Atomic claim while enqueue is attempted. Returns false when key is reserved or committed. */
export function reservePlaybackKey(
  key: string,
  meta?: PlaybackKeyTraceMeta
): boolean {
  tracePaymentAnimation({
    stage: "playback_key_reservation_requested",
    playbackKey: key,
    surface: meta?.surface,
    eventId: meta?.eventId,
    bundleId: meta?.bundleId,
    seq: meta?.seq,
    characterName: meta?.characterName,
    styleName: meta?.styleName,
  });

  const current = getPlaybackKeyState(key);
  if (current === "reserved") {
    traceStateChange(
      "playback_key_duplicate_reserved",
      key,
      current,
      current,
      meta
    );
    return false;
  }
  if (current === "committed") {
    traceStateChange(
      "playback_key_duplicate_committed",
      key,
      current,
      current,
      meta
    );
    return false;
  }

  playbackKeyStates.set(key, "reserved");
  traceStateChange("playback_key_reserved", key, "unseen", "reserved", meta);
  return true;
}

/** Commit reserved → committed when the queue task actually starts. */
export function commitPlaybackKey(
  key: string,
  meta?: PlaybackKeyTraceMeta
): boolean {
  const previous = getPlaybackKeyState(key);
  if (previous !== "reserved") {
    return false;
  }
  playbackKeyStates.set(key, "committed");
  committedOrder.push(key);
  while (committedOrder.length > MAX_COMMITTED_ENTRIES) {
    const evicted = committedOrder.shift();
    if (evicted && playbackKeyStates.get(evicted) === "committed") {
      playbackKeyStates.delete(evicted);
    }
  }
  traceStateChange(
    "playback_key_committed_task_started",
    key,
    "reserved",
    "committed",
    meta
  );
  return true;
}

/** Release reserved keys only. Committed keys are never released in Phase E2. */
export function releasePlaybackKey(
  key: string,
  reason: PlaybackKeyReleaseReason,
  meta?: PlaybackKeyTraceMeta
): boolean {
  const previous = getPlaybackKeyState(key);
  if (previous !== "reserved") {
    return false;
  }
  playbackKeyStates.delete(key);
  const stageByReason: Record<PlaybackKeyReleaseReason, string> = {
    queue_disabled: "playback_key_released_queue_disabled",
    queue_full: "playback_key_released_queue_full",
    generation_abort: "playback_key_released_generation_abort",
    flush: "playback_key_released_flush",
  };
  traceStateChange(stageByReason[reason], key, "reserved", "unseen", meta);
  return true;
}

export function clearPlaybackKeyState(): void {
  playbackKeyStates.clear();
  committedOrder.length = 0;
}

/** @deprecated Use getPlaybackKeyState(key) === "committed" or reserve/commit APIs. */
export function isPlaybackKeyBlocked(key: string): boolean {
  return playbackKeyStates.has(key);
}
