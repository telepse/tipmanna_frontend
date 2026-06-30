"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  EyeIcon,
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
import { CommentDrawer } from "@/components/events/comment-drawer";
import { fetchTvChannelEncountersBatch } from "@/lib/tv/channelEncountersClient";
import type { RoomCharacter } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CommentDrawerTarget = {
  eventId: string;
  channelId: string | null;
  videoTitle: string;
  videoDescription: string;
  numOfTips: number;
};

function resolveCommentDrawerTarget(item: {
  defaultChannelEventId?: string;
  channel?: {
    id?: string | number;
    eventId?: string;
    title?: string;
    description?: string | null;
    numOfTips?: number;
  };
}): CommentDrawerTarget | null {
  const eventId = String(
    item.defaultChannelEventId ?? item.channel?.eventId ?? ""
  ).trim();
  if (!eventId || eventId === "notice") return null;

  return {
    eventId,
    channelId:
      item.channel?.id != null ? String(item.channel.id) : null,
    videoTitle:
      typeof item.channel?.title === "string" ? item.channel.title : "",
    videoDescription:
      typeof item.channel?.description === "string"
        ? item.channel.description
        : "",
    numOfTips:
      typeof item.channel?.numOfTips === "number"
        ? item.channel.numOfTips
        : 0,
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

  const titleTrim = layout === "mobile" ? 20 : 24;

  const airTimeBadgeClass =
    "text-muted-foreground shrink-0 rounded border border-black bg-white px-1 py-0.5 text-[9.5px] lg:text-[8px]";
  const metricRowClass =
    "text-muted-foreground flex min-w-0 flex-nowrap items-center gap-2 text-[8px] font-semibold";
  const metricItemClass = "flex shrink-0 items-center gap-1 whitespace-nowrap";

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

  const previewChannelsMissingEncounters = useMemo(() => {
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
      if (typeof item.channel?.encounters !== "number") {
        missing.add(channelId);
      }
    }
    return [...missing];
  }, [previewIndices, items, currentIndex, playingItemOverride]);

  const [encountersByChannelId, setEncountersByChannelId] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const seeded: Record<string, number> = {};
    for (const originalIndex of previewIndices) {
      const item =
        originalIndex === currentIndex && playingItemOverride
          ? playingItemOverride
          : items[originalIndex];
      const channelId = item?.channel?.id;
      if (
        typeof channelId === "string" &&
        typeof item?.channel?.encounters === "number"
      ) {
        seeded[channelId] = item.channel.encounters;
      }
    }
    setEncountersByChannelId(seeded);
  }, [previewIndices, items, currentIndex, playingItemOverride]);

  useEffect(() => {
    if (previewChannelsMissingEncounters.length === 0) return;

    let cancelled = false;
    void (async () => {
      const fetched = await fetchTvChannelEncountersBatch(
        previewChannelsMissingEncounters
      );
      if (cancelled || Object.keys(fetched).length === 0) return;
      setEncountersByChannelId(prev => ({ ...prev, ...fetched }));
    })();

    return () => {
      cancelled = true;
    };
  }, [previewChannelsMissingEncounters]);

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
      {previewIndices.map(originalIndex => {
        const item =
          originalIndex === currentIndex && playingItemOverride
            ? playingItemOverride
            : items[originalIndex];
        if (!item) return null;
        // const isPlaying =
        //   mode === "GLOBAL"
        //     ? originalIndex === liveBroadcastIndex
        //     : !playingItemOverride && originalIndex === currentIndex;
        const isPlaying =
          mode === "GLOBAL"
            ? originalIndex === liveBroadcastIndex
            : schedulePlayingSlot?.rowIndex === originalIndex;
        const startLabel = pickTimeLabel(originalIndex);

        const { contentLanguage, flagUrl } = resolveContentLocaleDisplay(
          item.channel.contentLanguage,
          item.channel.contentCountry
        );

        const channelId =
          typeof item.channel?.id === "string" ? item.channel.id : "";
        const encounterCount =
          (channelId ? encountersByChannelId[channelId] : undefined) ??
          item.channel.encounters ??
          0;

        return (
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
            className={`relative flex cursor-pointer items-center justify-between gap-4 rounded-md bg-white px-2 py-0.5 transition-all duration-300 ${isPlaying ? "ring-primary scale-100 shadow-lg ring-4" : "-mt-2 scale-100 rounded-none border-b-4"} `}
          >
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
                  <span className={airTimeBadgeClass}>{startLabel}</span>
                ) : null}
                <span className={metricItemClass}>
                  <UsersRound className="size-3 shrink-0" />
                  {item.channel.numOfTips || 0} tips
                </span>
                <span className={metricItemClass}>
                  <EyeIcon className="size-3 shrink-0" />
                  {encounterCount} seen
                </span>
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end justify-end gap-1">
              <button
                type="button"
                className="flex items-center gap-1 text-[8px] font-semibold outline outline-black"
                onClick={e => {
                  e.stopPropagation();
                  openCommentDrawer(item);
                }}
              >
                <span className="flex items-center gap-1 whitespace-nowrap">
                  Created by:
                  <ArrowRight className="size-4 cursor-pointer" />
                </span>
              </button>

              <div className="flex w-fit items-center gap-1">
                <span className="flex items-center gap-1 text-[9px]">
                  <img
                    src={flagUrl}
                    alt={contentLanguage}
                    className="size-4"
                  />{" "}
                  {contentLanguage}
                </span>

                <p className="w-fit rounded-md bg-gray-200 px-1 py-0.5 text-[8px] text-black lg:text-[8px]">
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
        );
      })}

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
        />
      ) : null}
    </>
  );
}
