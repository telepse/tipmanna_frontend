"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  EyeIcon,
  MessageCircleMore,
  UsersRound,
} from "lucide-react";
import { trimTitle } from "@/lib/utils";
import { useTV } from "../tv-provider";
import { resolveContentLocaleDisplay } from "@/lib/tv/contentLocaleDisplay";
import {
  cumulativeStartOffsetSeconds,
  formatPlaylistClock,
  buildRotatedScheduleOrder,
  nextTwelveHourBlockStartMs,
  wallClockStartMsForScheduleIndex,
  type WallClockLabelMode,
} from "@/lib/tv/playlistDisplay";
import {
  resolveSegmentVisualKind,
  segmentAirTimeClass,
  segmentMetricClass,
  segmentRowClass,
} from "@/lib/tv/segment-visual-style";
import { CommentDrawer } from "@/components/events/comment-drawer";
import {
  fetchTvChannelMetricsBatch,
  type TvChannelRowMetrics,
} from "@/lib/tv/channelEncountersClient";
import type { RoomCharacter } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CommentDrawerTarget = {
  eventId: string;
  channelId: string | null;
  videoTitle: string;
  videoDescription: string;
  numOfTips: number;
  hostName?: string;
  hostUsername?: string;
};

function resolveCommentDrawerTarget(item: {
  defaultChannelEventId?: string;
  channel?: {
    id?: string | number;
    eventId?: string;
    title?: string;
    description?: string | null;
    numOfTips?: number;
    hostName?: string;
    username?: string;
  };
}): CommentDrawerTarget | null {
  const eventId = String(
    item.defaultChannelEventId ?? item.channel?.eventId ?? ""
  ).trim();
  if (!eventId || eventId === "notice") return null;

  return {
    eventId,
    channelId: item.channel?.id != null ? String(item.channel.id) : null,
    videoTitle:
      typeof item.channel?.title === "string" ? item.channel.title : "",
    videoDescription:
      typeof item.channel?.description === "string"
        ? item.channel.description
        : "",
    numOfTips:
      typeof item.channel?.numOfTips === "number" ? item.channel.numOfTips : 0,
    hostName:
      typeof item.channel?.hostName === "string"
        ? item.channel.hostName
        : undefined,
    hostUsername:
      typeof item.channel?.username === "string"
        ? item.channel.username
        : undefined,
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONCERT_MUSIC: "Concert",
  DRAMA_ART: "Drama",
  FESTIVAL: "Festival",
  FOOD: "Food",
  HANG_OUT: "Hangout",
  ISLAMIC: "Islamic",
  CHRISTIAN: "Christian",
  CORPORATE: "Corporate",
  COMEDY: "Comedy",
  FASHION: "Fashion",
  GAME_SPORT: "Games",
  CHILDREN: "Children",
  EDUCATION: "Education",
  OTHER: "Other",
};

type Props = {
  showTimes?: boolean;
  /** When true, show live TV times even if mode is LOCAL (authoritative schedule) */
  forceGlobalTimes?: boolean;
  variant: "activeBatch" | "alternateBatch";
  onSelectChannel: (indexInBatch: number) => void;
  tippingCharacters?: RoomCharacter[];
};

const metricRowClass =
  "text-muted-foreground flex min-w-0 flex-nowrap items-center gap-1 text-[8px] font-semibold";

export default function PlaylistTable({
  showTimes,
  forceGlobalTimes,
  variant,
  onSelectChannel,
  tippingCharacters,
}: Props) {
  const {
    items,
    alternateBatchItems,
    broadcastEpoch,
    totalDuration,
    mode,
    getSyncedNow,
    liveBroadcastIndex,
    schedulePlayingSlot,
  } = useTV();

  const list = variant === "activeBatch" ? items : alternateBatchItems;

  const [commentDrawerTarget, setCommentDrawerTarget] =
    useState<CommentDrawerTarget | null>(null);

  const [metricsByChannelId, setMetricsByChannelId] = useState<
    Record<string, TvChannelRowMetrics>
  >({});

  /** Schedule list always follows live broadcast order (not local playback). */
  const activeBatchRotationStart = liveBroadcastIndex;

  const orderedIndices = useMemo(
    () =>
      variant === "activeBatch"
        ? forceGlobalTimes
          ? list.map((_, i) => i)
          : buildRotatedScheduleOrder(list.length, activeBatchRotationStart)
        : list.map((_, i) => i),
    [variant, forceGlobalTimes, list, activeBatchRotationStart]
  );

  const channelsMissingMetrics = useMemo(() => {
    const missing = new Set<string>();
    for (const rowIndex of orderedIndices) {
      const item = list[rowIndex];
      const channelId = item?.channel?.id;
      if (
        typeof channelId !== "string" ||
        !UUID_RE.test(channelId) ||
        item.segmentKind === "notice"
      ) {
        continue;
      }
      const hasEncounters = typeof item.channel?.encounters === "number";
      const hasComments =
        typeof (item.channel as { comments?: unknown })?.comments === "number";
      if (!hasEncounters || !hasComments) {
        missing.add(channelId);
      }
    }
    return [...missing];
  }, [orderedIndices, list]);

  useEffect(() => {
    const seeded: Record<string, TvChannelRowMetrics> = {};
    for (const rowIndex of orderedIndices) {
      const item = list[rowIndex];
      const channelId = item?.channel?.id;
      if (typeof channelId !== "string") continue;
      const channel = item?.channel as
        | { encounters?: number; comments?: number }
        | undefined;
      if (
        typeof channel?.encounters === "number" ||
        typeof channel?.comments === "number"
      ) {
        seeded[channelId] = {
          encounters: channel?.encounters ?? 0,
          comments: channel?.comments ?? 0,
        };
      }
    }
    setMetricsByChannelId(seeded);
  }, [orderedIndices, list]);

  useEffect(() => {
    if (channelsMissingMetrics.length === 0) return;

    let cancelled = false;
    void (async () => {
      const fetched = await fetchTvChannelMetricsBatch(channelsMissingMetrics);
      if (cancelled || Object.keys(fetched).length === 0) return;
      setMetricsByChannelId(prev => ({ ...prev, ...fetched }));
    })();

    return () => {
      cancelled = true;
    };
  }, [channelsMissingMetrics]);

  if (!list.length) return null;

  const activeWallClockMode: WallClockLabelMode =
    variant === "activeBatch" && forceGlobalTimes
      ? "strictHalfDay"
      : variant === "activeBatch"
        ? "rotatedQueue"
        : "strictHalfDay";

  const now = getSyncedNow();

  const effectiveShowTimes =
    (forceGlobalTimes || (showTimes !== false && mode === "GLOBAL")) &&
    broadcastEpoch != null &&
    (variant === "activeBatch"
      ? totalDuration > 0
      : alternateBatchItems.length > 0);

  const openCommentDrawer = (
    item: Parameters<typeof resolveCommentDrawerTarget>[0]
  ) => {
    const target = resolveCommentDrawerTarget(item);
    if (target) setCommentDrawerTarget(target);
  };

  const pickTimeLabel = (rowIndex: number) => {
    if (!effectiveShowTimes || broadcastEpoch == null) return "";

    if (variant === "activeBatch" && totalDuration) {
      return formatPlaylistClock(
        wallClockStartMsForScheduleIndex(
          broadcastEpoch,
          totalDuration,
          now,
          liveBroadcastIndex,
          rowIndex,
          items,
          activeWallClockMode
        )
      );
    }

    if (variant === "alternateBatch") {
      const off = cumulativeStartOffsetSeconds(alternateBatchItems, rowIndex);
      return formatPlaylistClock(
        nextTwelveHourBlockStartMs(broadcastEpoch, now) + off * 1000
      );
    }

    return "";
  };

  const isRowPlaying = (rowIndex: number) => {
    if (variant === "activeBatch") {
      if (mode === "GLOBAL") return rowIndex === liveBroadcastIndex;
      return (
        schedulePlayingSlot?.scope === "active" &&
        schedulePlayingSlot.rowIndex === rowIndex
      );
    }
    return (
      schedulePlayingSlot?.scope === "alternate" &&
      schedulePlayingSlot.rowIndex === rowIndex
    );
  };

  const isRowLiveOnBroadcast = (rowIndex: number) =>
    variant === "activeBatch" && rowIndex === liveBroadcastIndex;

  return (
    <>
      <div className="w-full space-y-2">
        {orderedIndices.map((rowIndex, liveIndex) => {
          const item = list[rowIndex];
          if (!item) return null;

          const segmentKind = resolveSegmentVisualKind(item);
          const sectionDivider =
            item.isSectionStart && item.sectionTitle ? (
              <div
                key={`section-${item.id}-${rowIndex}`}
                className="text-muted-foreground border-primary/30 mt-3 mb-1 border-t pt-2 text-[11px] font-semibold tracking-wide uppercase"
              >
                {item.sectionTitle}
              </div>
            ) : null;

          const isPlaying = isRowPlaying(rowIndex);
          const isLiveOnBroadcast = isRowLiveOnBroadcast(rowIndex);
          const showAired =
            variant === "activeBatch" &&
            forceGlobalTimes &&
            rowIndex < liveBroadcastIndex;
          const startLabel = pickTimeLabel(rowIndex);

          const { contentLanguage, flagUrl } = resolveContentLocaleDisplay(
            item.channel.contentLanguage,
            item.channel.contentCountry
          );

          const channelId =
            typeof item.channel?.id === "string" ? item.channel.id : "";
          const channelMetrics = channelId
            ? metricsByChannelId[channelId]
            : undefined;
          const channelComments =
            channelMetrics?.comments ??
            (item.channel as { comments?: number })?.comments ??
            0;
          const encounterCount =
            channelMetrics?.encounters ?? item.channel.encounters ?? 0;

          return (
            <div key={`wrap-${item.id || liveIndex}`}>
              {sectionDivider}
              <div
                key={item.id || liveIndex}
                role="button"
                tabIndex={0}
                onClick={() => onSelectChannel(rowIndex)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChannel(rowIndex);
                  }
                }}
                className={`${segmentRowClass(segmentKind, isPlaying)} ${showAired ? "opacity-80" : ""}`}
              >
                {isLiveOnBroadcast && !isPlaying ? (
                  <span className="bg-primary/10 text-primary absolute top-1 right-2 rounded px-1 py-0.5 text-[9px] font-semibold">
                    Live TV
                  </span>
                ) : null}
                <div
                  className={`min-w-0 flex-1 space-y-1 ${isPlaying ? "sticky top-0" : ""}`}
                >
                  <h5 className="w-full text-xs font-medium whitespace-nowrap">
                    {typeof item?.channel?.title === "string" &&
                    item.channel.title.trim()
                      ? trimTitle(item.channel.title, 20)
                      : "Loading..."}
                  </h5>

                  <p className={metricRowClass}>
                    {effectiveShowTimes && startLabel ? (
                      <span className={segmentAirTimeClass(segmentKind)}>
                        {showAired ? `Aired ${startLabel}` : startLabel}
                      </span>
                    ) : null}
                    <span className={segmentMetricClass(segmentKind)}>
                      <MessageCircleMore className="size-3 shrink-0" />
                      {channelComments}
                    </span>
                    <span className={segmentMetricClass(segmentKind)}>
                      <UsersRound className="size-3 shrink-0" />
                      {item.channel.numOfTips || 0} tips
                    </span>

                    <span className={segmentMetricClass(segmentKind)}>
                      <EyeIcon className="size-3 shrink-0" />
                      {encounterCount} seen
                    </span>
                  </p>
                </div>

                <div
                  className={`bg-secondary/30 flex shrink-0 flex-col items-end justify-end gap-1 rounded-md border px-1 py-0.5 shadow-lg ${segmentKind === "notice" ? "border-white/50" : "border-gray-300"}`}
                  onClick={e => {
                    e.stopPropagation();
                    openCommentDrawer(item);
                  }}
                >
                  <button
                    type="button"
                    className={`flex items-center gap-[0.25px] rounded px-1 py-[0.5px] text-[8px] font-semibold outline ${segmentKind === "notice" ? "outline-white/50" : ""}`}
                  >
                    <span className="flex cursor-pointer items-center gap-0.5 whitespace-nowrap">
                      <span className="text-[8px] sm:text-[7px]">
                        Video info:
                      </span>
                      <ArrowRight className="size-2 cursor-pointer" />
                    </span>
                  </button>

                  <div className="flex w-fit items-center gap-1">
                    <span className="flex items-center gap-0.5 text-[9px]">
                      {flagUrl ? (
                        <img
                          src={flagUrl}
                          alt={contentLanguage}
                          className="h-3 w-4 sm:h-2 sm:w-3"
                        />
                      ) : null}{" "}
                      {/* <span className="text-[8px] sm:text-[6px]">
                        {contentLanguage}
                      </span> */}
                    </span>

                    <p
                      className={`w-fit rounded-md px-1 py-0.5 text-[8px] lg:text-[6px] ${segmentKind === "notice" ? "bg-gray-500 text-white/80" : "bg-gray-200 text-black"}`}
                    >
                      {EVENT_TYPE_LABELS[item.channel.eventType] ?? "Other"}
                    </p>
                  </div>
                </div>

                {isPlaying && (
                  <div className="absolute top-0 -left-4 z-20 bg-white lg:-left-6">
                    <span className="flex flex-col">
                      <AudioLines className="text-primary wave-icon" />
                      <AudioLines className="text-primary wave-icon" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {commentDrawerTarget ? (
        <CommentDrawer
          isCommentDrawerOpen={commentDrawerTarget != null}
          setIsCommentDrawerOpen={open => {
            if (!open) setCommentDrawerTarget(null);
          }}
          eventId={commentDrawerTarget.eventId}
          channelId={commentDrawerTarget.channelId}
          videoTitle={commentDrawerTarget.videoTitle}
          videoDescription={commentDrawerTarget.videoDescription}
          numOfTips={commentDrawerTarget.numOfTips}
          tippingCharacters={tippingCharacters}
          hostName={commentDrawerTarget.hostName}
          hostUsername={commentDrawerTarget.hostUsername}
          stackAboveImmersive
        />
      ) : null}
    </>
  );
}
