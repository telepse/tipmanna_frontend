"use client";

/** Host playlist preview drawer — feature-card banner intentionally omitted (not a live tip surface). */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  EyeIcon,
  Info,
  MessageCircleMore,
  UsersRound,
} from "lucide-react";
import { trimTitle } from "@/lib/utils";
import { useTV } from "@/components/tv-provider";
import { resolveContentLocaleDisplay } from "@/lib/tv/contentLocaleDisplay";
import {
  buildPreviewRowIndices,
  formatPlaylistClock,
  wallClockStartMsForScheduleIndex,
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
import { resolveTvScheduleEventId } from "@/lib/resolve-tv-schedule-event-id";
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
  const eventId = resolveTvScheduleEventId({
    channel: item.channel,
    defaultChannelEventId: item.defaultChannelEventId,
  });
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

type Layout = "mobile" | "desktop";

export function TvPlaylistPreview({
  layout,
  onSelectChannel,
  onContinueCommentToTip,
  tippingCharacters,
}: {
  layout: Layout;
  onSelectChannel: (index: number) => void;
  onContinueCommentToTip?: () => void;
  tippingCharacters?: RoomCharacter[];
}) {
  const {
    items,
    broadcastEpoch,
    totalDuration,
    currentIndex,
    mode,
    getSyncedNow,
    liveBroadcastIndex,
    playingItemOverride,
    previewPinIndex,
    ongoingCollection,
    activeBatch,
    schedulePlayingSlot,
  } = useTV();

  const effectivePinIndex =
    mode === "GLOBAL" ? liveBroadcastIndex : previewPinIndex;

  const previewIndices = useMemo(
    () =>
      buildPreviewRowIndices(
        items.length,
        effectivePinIndex,
        liveBroadcastIndex,
        10
      ),
    [items.length, effectivePinIndex, liveBroadcastIndex]
  );

  const now = getSyncedNow();

  const showTimes = mode === "GLOBAL" && broadcastEpoch != null;

  const titleTrim = layout === "mobile" ? 30 : 20;

  const metricRowClass =
    "text-muted-foreground flex min-w-0 flex-nowrap items-center gap-1 text-[8px] font-semibold";

  const pickTimeLabel = (originalIndex: number) => {
    if (!showTimes || broadcastEpoch == null || !totalDuration) return "";
    const ms = wallClockStartMsForScheduleIndex(
      broadcastEpoch,
      totalDuration,
      now,
      liveBroadcastIndex,
      originalIndex,
      items,
      "strictHalfDay"
    );
    return formatPlaylistClock(ms);
  };

  const [commentDrawerTarget, setCommentDrawerTarget] =
    useState<CommentDrawerTarget | null>(null);

  const previewChannelsMissingMetrics = useMemo(() => {
    const missing = new Set<string>();
    for (const originalIndex of previewIndices) {
      const item =
        originalIndex === currentIndex && playingItemOverride
          ? playingItemOverride
          : items[originalIndex];
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
  }, [previewIndices, items, currentIndex, playingItemOverride]);

  const [metricsByChannelId, setMetricsByChannelId] = useState<
    Record<string, TvChannelRowMetrics>
  >({});

  useEffect(() => {
    const seeded: Record<string, TvChannelRowMetrics> = {};
    for (const originalIndex of previewIndices) {
      const item =
        originalIndex === currentIndex && playingItemOverride
          ? playingItemOverride
          : items[originalIndex];
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
  }, [previewIndices, items, currentIndex, playingItemOverride]);

  useEffect(() => {
    if (previewChannelsMissingMetrics.length === 0) return;

    let cancelled = false;
    void (async () => {
      const fetched = await fetchTvChannelMetricsBatch(
        previewChannelsMissingMetrics
      );
      if (cancelled || Object.keys(fetched).length === 0) return;
      setMetricsByChannelId(prev => ({ ...prev, ...fetched }));
    })();

    return () => {
      cancelled = true;
    };
  }, [previewChannelsMissingMetrics]);

  const openCommentDrawer = (
    item: Parameters<typeof resolveCommentDrawerTarget>[0]
  ) => {
    const target = resolveCommentDrawerTarget(item);
    if (target) setCommentDrawerTarget(target);
  };

  return (
    <>
      {ongoingCollection?.collectionTitle && (
        <p className="text-muted-foreground mb-2 px-1 text-[11px]">
          Now playing from:{" "}
          <span className="text-foreground font-medium">
            {ongoingCollection.collectionTitle}
          </span>
          {activeBatch != null ? (
            <span className="text-muted-foreground">
              {" "}
              · batch {activeBatch}
            </span>
          ) : null}
        </p>
      )}
      <div className="space-y-2 pt-1">
        {previewIndices.map(originalIndex => {
          const item =
            originalIndex === currentIndex && playingItemOverride
              ? playingItemOverride
              : items[originalIndex];
          if (!item) return null;

          const segmentKind = resolveSegmentVisualKind(item);
          const sectionDivider =
            item.isSectionStart && item.sectionTitle ? (
              <div
                key={`section-${item.id}-${originalIndex}`}
                className="text-muted-foreground border-primary/30 mt-3 mb-1 border-t pt-2 text-[11px] font-semibold tracking-wide uppercase"
              >
                {item.sectionTitle}
              </div>
            ) : null;

          const isPlaying =
            mode === "GLOBAL"
              ? originalIndex === liveBroadcastIndex
              : schedulePlayingSlot?.scope === "active" &&
                schedulePlayingSlot.rowIndex === originalIndex;
          const isLiveOnBroadcast = originalIndex === liveBroadcastIndex;
          const startLabel = pickTimeLabel(originalIndex);

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
            <div key={`wrap-${item.id}-${originalIndex}`}>
              {sectionDivider}
              <div
                key={`${item.id}-${originalIndex}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectChannel(originalIndex)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChannel(originalIndex);
                  }
                }}
                className={segmentRowClass(segmentKind, isPlaying)}
              >
                {mode === "LOCAL" && isLiveOnBroadcast && !isPlaying ? (
                  <span className="bg-primary/10 text-primary absolute top-1 right-2 rounded px-1 py-0.5 text-[9px] font-semibold">
                    Live TV
                  </span>
                ) : null}
                <div
                  className={`min-w-0 flex-1 space-y-1 ${isPlaying ? "sticky top-0" : ""}`}
                >
                  <h5 className="w-full text-xs font-medium whitespace-nowrap">
                    {item?.channel?.title
                      ? trimTitle(item.channel.title, titleTrim)
                      : "Loading..."}
                  </h5>

                  <p className={metricRowClass}>
                    {showTimes && startLabel ? (
                      <span className={segmentAirTimeClass(segmentKind)}>
                        {startLabel}
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
                      {encounterCount}{" "}
                      <span className="inline sm:hidden">seen</span>
                    </span>
                  </p>
                </div>

                <div className="bg-secondary/30 flex shrink-0 flex-col items-end justify-end gap-0.5 rounded-md px-1 py-2.5 shadow-2xl">
                  <div className="flex w-fit items-center gap-1">
                    <button
                      type="button"
                      className="cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        openCommentDrawer(item);
                      }}
                      aria-label="Video info"
                    >
                      <Info className="size-3" />
                    </button>

                    <span className="flex items-center gap-0.5 text-[9px]">
                      {flagUrl ? (
                        <img
                          src={flagUrl}
                          alt={contentLanguage}
                          className="h-3 w-4 sm:h-2 sm:w-3"
                        />
                      ) : null}
                    </span>

                    {/* <p className="w-[50px] rounded-md bg-gray-200 px-1 py-0.25 text-center text-[8px] text-black lg:text-[6px]">
                      {EVENT_TYPE_LABELS[item.channel.eventType] ?? "Other"}
                    </p> */}
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
          onContinueToTip={onContinueCommentToTip}
          hostName={commentDrawerTarget.hostName}
          hostUsername={commentDrawerTarget.hostUsername}
          stackAboveImmersive
        />
      ) : null}
    </>
  );
}
