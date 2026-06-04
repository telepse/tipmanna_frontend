"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AudioLines, UsersRound } from "lucide-react";
import { trimTitle } from "@/lib/utils";
import { useTV } from "@/components/tv-provider";
import {
  buildPreviewRowIndices,
  formatPlaylistClock,
  wallClockStartMsForScheduleIndex,
} from "@/lib/tv/playlistDisplay";

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
  GAME_SPORT: "Game & Sport",
  CHILDREN: "Children",
  EDUCATION: "Education",
  OTHER: "Other",
};

type Layout = "mobile" | "desktop";

const countryToCode: Record<string, string> = {
  Nigeria: "ng",
  England: "gb",
};

export function TvPlaylistPreview({
  layout,
  onSelectChannel,
}: {
  layout: Layout;
  onSelectChannel: (index: number) => void;
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
    schedulePlayingSlot,
    ongoingCollection,
    activeBatch,
  } = useTV();

  const previewPinIndex =
    mode === "GLOBAL"
      ? liveBroadcastIndex
      : schedulePlayingSlot?.scope === "active"
        ? schedulePlayingSlot.rowIndex
        : currentIndex;

  const previewIndices = useMemo(
    () =>
      buildPreviewRowIndices(
        items.length,
        previewPinIndex,
        liveBroadcastIndex,
        10
      ),
    [items.length, previewPinIndex, liveBroadcastIndex]
  );

  const now = getSyncedNow();

  const showTimes = mode === "GLOBAL" && broadcastEpoch != null;

  const titleTrim = layout === "mobile" ? 20 : 24;
  const hostTrim = layout === "mobile" ? 10 : 20;

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
        const isPlaying =
          mode === "GLOBAL"
            ? originalIndex === liveBroadcastIndex
            : schedulePlayingSlot?.scope === "active"
              ? originalIndex === schedulePlayingSlot.rowIndex
              : originalIndex === currentIndex;
        const startLabel = pickTimeLabel(originalIndex);

        const contentCountryCode = countryToCode[item.channel.contentCountry];

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
              className={`flex min-w-0 flex-1 items-center gap-1 ${isPlaying ? "sticky top-0" : ""}`}
            >
              {isPlaying && (
                <div className="flex shrink-0 flex-col gap-1">
                  {showTimes && (
                    <span className="text-muted-foreground -ml-2 rounded border border-black px-1 py-0.5 text-[9.5px]">
                      {startLabel}
                    </span>
                  )}
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <h5 className={`w-full text-xs font-medium whitespace-nowrap`}>
                  {item?.channel?.title
                    ? trimTitle(item.channel.title, titleTrim)
                    : "Loading..."}
                </h5>

                <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-[10px] ">
                  {!isPlaying && showTimes && (
                    <span className="text-muted-foreground mr-1 -ml-2 rounded border border-black px-1 py-0.5 text-[9.5px]">
                      {startLabel}
                    </span>
                  )}
                  <span>
                    Host:{" "}
                    {item?.channel?.hostName
                      ? trimTitle(item.channel.hostName.split(" ")[0], hostTrim)
                      : "Loading..."}
                  </span>
                  <span className="text-primary text-[10px] opacity-50">
                    {/* <Link
                      href={`/channel/${item?.defaultChannelEventId ?? item?.channel?.eventId ?? ""}`}
                      onClick={e => e.stopPropagation()}
                    >
                      @{item.channel.username?.substring(0, 8) || ""}
                    </Link> */}
                    <Link
                      href={`/channel/${item?.channel?.eventId}`}
                      onClick={e => e.stopPropagation()}
                    >
                      @{item.channel.username?.substring(0, 8) || ""}
                    </Link>
                  </span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end justify-end gap-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold">
                <UsersRound className="size-3" />
                <span className="whitespace-nowrap">
                  {item.channel.numOfTips || 0} tips
                </span>
              </span>

              {/** Convert content language to flag. Content languag is in the format of en-GB, en-US, etc. */}
              {/** Convert content country to flag. Content country is in the format England, Nigeria, */}
              <div className="flex w-fit items-center gap-1">
                <span className="flex items-center gap-1 text-[9px]">
                  <img
                    src={`https://flagcdn.com/w40/${contentCountryCode}.png`}
                    alt={item.channel.contentLanguage}
                    className="size-4"
                  />{" "}
                  {item.channel.contentLanguage}
                </span>

                <p className="w-fit rounded-md bg-gray-200 px-1 py-0.5 text-[10px] text-black">
                  {EVENT_TYPE_LABELS[item.channel.eventType] ?? "Other"}
                </p>
              </div>
            </div>

            {isPlaying && (
              <div className="absolute top-0 -left-4 bg-white">
                <span className="flex flex-col">
                  <AudioLines className="text-primary wave-icon" />
                  <AudioLines className="text-primary wave-icon" />
                </span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
