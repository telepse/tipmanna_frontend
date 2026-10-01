/**
 * Whether syncToLive should take the index-change branch (load/coalesced seek for a new row).
 * When only lastSyncedIndex is stale (-1) but currentIndex and video already match live, skip it.
 */
export function shouldSyncToLiveIndexChangeBranch(opts: {
  scheduleIndex: number;
  lastSyncedIndex: number;
  currentIndex: number;
  sameVideo: boolean;
}): boolean {
  if (opts.scheduleIndex === opts.lastSyncedIndex) {
    return false;
  }
  if (opts.sameVideo && opts.scheduleIndex === opts.currentIndex) {
    return false;
  }
  return true;
}
