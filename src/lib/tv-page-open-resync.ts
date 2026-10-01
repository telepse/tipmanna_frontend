/**
 * tv-page-open: revalidate GLOBAL live position without forcing lastSyncedIndex=-1
 * when the player is already on the effective live row/video.
 */

export type TvPageOpenResyncInput = {
  modeGlobal: boolean;
  playerReady: boolean;
  broadcastEpoch: number | null;
  itemsLength: number;
  totalDuration: number;
  liveScheduleIndex: number;
  liveVideoId: string | null;
  currentIndex: number;
  orchestratedVideoId: string | null;
};

/**
 * When non-null, set lastSyncedIndex to this value before maybeSyncToLive.
 * When null, preserve legacy behavior (caller sets -1).
 */
export function resolveTvPageOpenLastSyncedReseed(
  input: TvPageOpenResyncInput
): number | null {
  if (!input.modeGlobal) return null;
  if (!input.playerReady) return null;
  if (input.broadcastEpoch == null) return null;
  if (input.itemsLength < 1 || input.totalDuration <= 0) return null;
  if (input.liveVideoId == null) return null;

  const onLiveRow = input.liveScheduleIndex === input.currentIndex;
  const videoMatches =
    input.orchestratedVideoId != null &&
    input.orchestratedVideoId === input.liveVideoId;

  if (onLiveRow && videoMatches) {
    return input.liveScheduleIndex;
  }

  return null;
}
