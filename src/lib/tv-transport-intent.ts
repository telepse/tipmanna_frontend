/**
 * Resolve queued play/pause when the YouTube command API is not ready.
 * Prefer play when state is unknown — a stale polled isPlaying=true must not
 * queue pause after the iframe has already stalled or died.
 */
export function resolvePendingTransportIntent(opts: {
  playerState: string | null | undefined;
}): "play" | "pause" {
  if (opts.playerState === "PLAYING" || opts.playerState === "BUFFERING") {
    return "pause";
  }
  return "play";
}

/**
 * Soft source/community switch must drop pending play/pause so community A
 * cannot execute against community B. Remount generation bumps alone do not
 * clear intent — TvPlayer construct epoch blocks stale onReady instead.
 */
export function shouldClearPendingTransportOnSourceChange(opts: {
  previousCommunityId: string | null | undefined;
  nextCommunityId: string | null | undefined;
}): boolean {
  return (opts.previousCommunityId ?? null) !== (opts.nextCommunityId ?? null);
}
