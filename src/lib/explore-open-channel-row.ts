import {
  getContentChannelAction,
  getExploreChannelMetricsAction,
  type ExploreChannelMetrics,
} from "@/actions/contents";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { mergeExploreChannelRows } from "@/lib/explore-channel-row-merge";

function isPlayableChannelRow(row: unknown): row is Record<string, unknown> {
  if (!row || typeof row !== "object") return false;
  const r = row as { restricted?: boolean; url?: string; liveStatus?: string };
  if (r.restricted) return false;
  if (typeof r.url !== "string" || !r.url.trim()) return false;
  if (r.liveStatus === "UPCOMING") return false;
  return true;
}

/**
 * Resolve a Discover handoff into a full explore reel row: playable url, event
 * tipping fields, and engagement metrics (same shape as explore feed batches).
 */
export async function resolveExploreOpenChannelRow(
  target: ExploreFeedOpenTarget
): Promise<Record<string, unknown> | null> {
  const { videoId, eventId, channelSnapshot } = target;

  let apiRow: Record<string, unknown> | null = null;
  const res = await getContentChannelAction(eventId);
  if (res.success && Array.isArray(res.data)) {
    const found = res.data.find(
      (c: unknown) =>
        c &&
        typeof c === "object" &&
        String((c as { id?: unknown }).id ?? "") === String(videoId)
    );
    if (found && typeof found === "object") {
      apiRow = found as Record<string, unknown>;
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
    if (apiRow && !apiRow.restricted && apiRow.event) {
      row = mergeExploreChannelRows(
        { event: apiRow.event as Record<string, unknown> },
        row
      );
    }
  }

  if (!row) return null;

  const metricsRes = await getExploreChannelMetricsAction(videoId);
  if (
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
