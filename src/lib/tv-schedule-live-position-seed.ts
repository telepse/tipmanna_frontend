import { extractYoutubeID } from "@/lib/extractYoutubeID";

export type ScheduleLivePositionApplySource =
  | "network_success"
  | "session_cache_bootstrap"
  | "fallback_cache";

export type ScheduleLivePositionSnapshot = {
  scheduleIndex: number;
  offsetSeconds: number;
};

export type ScheduleItemWithChannel = {
  channel?: { url?: string };
};

export function scheduleRowVideoId(
  items: ScheduleItemWithChannel[] | undefined,
  scheduleIndex: number
): string | null {
  const item = items?.[scheduleIndex];
  const url = item?.channel?.url;
  if (!url) return null;
  return extractYoutubeID(url);
}

export type ShouldSeedLivePositionInput = {
  source: ScheduleLivePositionApplySource;
  live: ScheduleLivePositionSnapshot;
  items: ScheduleItemWithChannel[] | undefined;
  activeScheduleId: string;
  previousActiveScheduleId: string | null;
  currentScheduleIndex: number;
  currentVideoId: string | null;
  /** Client has completed at least one GLOBAL index sync (lastSyncedIndex >= 0). */
  hasEstablishedPlaybackSync: boolean;
};

export type ShouldSeedLivePositionResult = {
  seed: boolean;
  reason: string;
};

/**
 * Whether applySchedulePayload should cold-start / reseed from payload livePosition.
 * Fresh network responses always seed; stale fallback must not reseed same row/video.
 */
export function shouldSeedLivePositionFromSchedulePayload(
  input: ShouldSeedLivePositionInput
): ShouldSeedLivePositionResult {
  const { source, live, items, activeScheduleId, previousActiveScheduleId } =
    input;

  if (source === "network_success") {
    return { seed: true, reason: "network_success" };
  }

  const liveVideoId = scheduleRowVideoId(items, live.scheduleIndex);

  if (!input.hasEstablishedPlaybackSync) {
    return { seed: true, reason: `${source}_no_established_sync` };
  }

  if (
    previousActiveScheduleId != null &&
    previousActiveScheduleId !== activeScheduleId
  ) {
    return { seed: true, reason: `${source}_schedule_id_changed` };
  }

  if (live.scheduleIndex !== input.currentScheduleIndex) {
    return { seed: true, reason: `${source}_index_changed` };
  }

  if (
    input.currentVideoId &&
    liveVideoId &&
    input.currentVideoId !== liveVideoId
  ) {
    return { seed: true, reason: `${source}_video_changed` };
  }

  if (source === "fallback_cache") {
    return { seed: false, reason: "fallback_preserve_same_row_video" };
  }

  return { seed: false, reason: "session_cache_preserve_same_row_video" };
}
