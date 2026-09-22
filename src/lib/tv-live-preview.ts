import {
  resolveBroadcastPosition,
  type ScheduleItem,
} from "@/lib/tv/broadcastResolver";

export type TvPreviewMode = "GLOBAL" | "LOCAL";

export type TvScheduleLivePosition = {
  scheduleIndex?: number;
  offsetSeconds?: number;
  loopPosition?: number;
  totalDuration?: number;
};

export type ParsedTvSchedulePayload = {
  items: ScheduleItem[];
  broadcastEpoch: number | null;
  totalDuration: number;
  livePosition: TvScheduleLivePosition | null;
};

export type LivePreviewPlayback = {
  scheduleIndex: number;
  offsetSeconds: number;
  item: ScheduleItem | null;
  loopPosition: number;
  totalDuration: number;
};

export function parseTvSchedulePayload(body: unknown): ParsedTvSchedulePayload {
  const data = (body ?? {}) as Record<string, unknown>;
  const items = Array.isArray(data.items) ? (data.items as ScheduleItem[]) : [];
  const broadcastEpoch =
    typeof data.broadcastEpoch === "number" ? data.broadcastEpoch : null;
  const totalDuration =
    typeof data.totalDuration === "number" && data.totalDuration > 0
      ? data.totalDuration
      : 0;
  const liveRaw = data.livePosition;
  const livePosition =
    liveRaw && typeof liveRaw === "object"
      ? (liveRaw as TvScheduleLivePosition)
      : null;

  return { items, broadcastEpoch, totalDuration, livePosition };
}

export function resolveLivePreviewPlayback(
  items: ScheduleItem[],
  broadcastEpoch: number | null,
  totalDuration: number,
  nowMs: number,
  livePosition?: TvScheduleLivePosition | null
): LivePreviewPlayback | null {
  if (!items.length || broadcastEpoch == null) return null;

  if (
    livePosition &&
    typeof livePosition.scheduleIndex === "number" &&
    typeof livePosition.offsetSeconds === "number"
  ) {
    const item = items[livePosition.scheduleIndex] ?? null;
    const pos = resolveBroadcastPosition(
      items,
      broadcastEpoch,
      totalDuration,
      nowMs
    );
    return {
      scheduleIndex: livePosition.scheduleIndex,
      offsetSeconds: livePosition.offsetSeconds,
      item,
      loopPosition: livePosition.loopPosition ?? pos.loopPosition,
      totalDuration: livePosition.totalDuration ?? pos.totalDuration,
    };
  }

  const pos = resolveBroadcastPosition(
    items,
    broadcastEpoch,
    totalDuration,
    nowMs
  );
  return {
    scheduleIndex: pos.scheduleIndex,
    offsetSeconds: pos.offsetSeconds,
    item: pos.item,
    loopPosition: pos.loopPosition,
    totalDuration: pos.totalDuration,
  };
}

export function shouldFollowLive(mode: TvPreviewMode): boolean {
  return mode === "GLOBAL";
}

export function shouldSwitchPreviewItem(opts: {
  mode: TvPreviewMode;
  liveScheduleIndex: number;
  loadedScheduleIndex: number;
  liveVideoId: string | null;
  loadedVideoId: string | null;
}): boolean {
  if (!shouldFollowLive(opts.mode)) return false;
  if (opts.liveScheduleIndex !== opts.loadedScheduleIndex) return true;
  if (!opts.liveVideoId || !opts.loadedVideoId) return false;
  return opts.liveVideoId !== opts.loadedVideoId;
}

/** After first embed construct, issue load only when switching live rows. */
export function shouldIssuePreviewLoad(opts: {
  force: boolean;
  embedEstablished: boolean;
  shouldSwitch: boolean;
}): boolean {
  if (opts.force && opts.embedEstablished) return true;
  if (!opts.embedEstablished) return false;
  return opts.shouldSwitch;
}

export function isNoticeScheduleItem(
  item: ScheduleItem | null | undefined
): boolean {
  return item?.segmentKind === "notice";
}

export function computeNoticeRemainingSec(
  item: ScheduleItem | null | undefined,
  loopPosition: number
): number {
  if (!item || item.segmentKind !== "notice") return 0;
  const start = item.axisStartSec ?? 0;
  const end =
    typeof item.axisEndSec === "number"
      ? item.axisEndSec
      : start + item.duration;
  return Math.max(0, end - loopPosition);
}

export function resolvePreviewPlaybackUrl(
  item: ScheduleItem | null | undefined,
  lastPlayableUrl: string,
  bootstrapPlayableUrl: string
): string {
  const url = item?.channel?.url?.trim() ?? "";
  if (url && item?.segmentKind !== "notice") return url;
  return lastPlayableUrl || bootstrapPlayableUrl;
}

export function findBootstrapPlayableUrl(items: ScheduleItem[]): string {
  for (const item of items) {
    const url = item.channel?.url?.trim();
    if (url && item.segmentKind !== "notice") return url;
  }
  return "";
}
