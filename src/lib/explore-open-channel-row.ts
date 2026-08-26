import {
  getContentChannelAction,
  getExploreChannelMetricsAction,
  type ExploreChannelMetrics,
} from "@/actions/contents";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { mergeExploreChannelRows } from "@/lib/explore-channel-row-merge";
import { unwrapContentChannelRows } from "@/lib/content-channel-rows";

function isPlayableChannelRow(row: unknown): row is Record<string, unknown> {
  if (!row || typeof row !== "object") return false;
  const r = row as { restricted?: boolean; url?: string; liveStatus?: string };
  if (r.restricted) return false;
  if (typeof r.url !== "string" || !r.url.trim()) return false;
  if (r.liveStatus === "UPCOMING") return false;
  return true;
}

/** Sync fast path: Discover list rows already include url + event for playback. */
export function buildExploreOpenRowFromSnapshot(
  target: ExploreFeedOpenTarget
): Record<string, unknown> | null {
  const { videoId, channelSnapshot } = target;
  if (!channelSnapshot || !isPlayableChannelRow(channelSnapshot)) return null;
  return {
    ...channelSnapshot,
    id: videoId,
  };
}

/**
 * Resolve a Discover handoff into a full explore reel row: playable url, event
 * tipping fields, and engagement metrics (same shape as explore feed batches).
 */
export async function resolveExploreOpenChannelRow(
  target: ExploreFeedOpenTarget
): Promise<Record<string, unknown> | null> {
  const { videoId, eventId, channelSnapshot } = target;

  const snapshotPlayable =
    channelSnapshot != null && isPlayableChannelRow(channelSnapshot);

  let apiRow: Record<string, unknown> | null = null;
  // Always fetch channel row so thin Discover snapshots get event.amountToRaise etc.
  const [channelRes, metricsRes] = await Promise.all([
    getContentChannelAction(eventId),
    getExploreChannelMetricsAction(videoId),
  ]);

  if (channelRes?.success) {
    const found = unwrapContentChannelRows(channelRes.data).find(
      c => String(c.id ?? "") === String(videoId)
    );
    if (found) {
      apiRow = found;
    }
  }

  let row: Record<string, unknown> | null = null;
  if (isPlayableChannelRow(apiRow)) {
    row = apiRow;
    if (channelSnapshot && isPlayableChannelRow(channelSnapshot)) {
      row = mergeExploreChannelRows(apiRow!, channelSnapshot);
    }
  } else if (channelSnapshot && isPlayableChannelRow(channelSnapshot)) {
    row = { ...channelSnapshot };
    const snap = apiRow as Record<string, unknown> | null;
    if (snap && snap.restricted !== true && snap.event) {
      row = mergeExploreChannelRows(
        { event: snap.event as Record<string, unknown> },
        row
      );
    }
  }

  if (!row) return null;

  if (
    metricsRes &&
    metricsRes.success &&
    metricsRes.data &&
    typeof metricsRes.data === "object" &&
    !(
      "restricted" in metricsRes.data &&
      (metricsRes.data as { restricted?: boolean }).restricted === true
    )
  ) {
    return {
      ...row,
      metrics: metricsRes.data as ExploreChannelMetrics,
    };
  }

  return row;
}
