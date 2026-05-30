"use client";

import { trimTitle } from "@/lib/utils";
import { Bookmark, UsersRound } from "lucide-react";
import { useTV } from "../tv-provider";
import {
  cumulativeStartOffsetSeconds,
  formatPlaylistClock,
  buildRotatedScheduleOrder,
  nextTwelveHourBlockStartMs,
  wallClockStartMsForScheduleIndex,
  type WallClockLabelMode,
} from "@/lib/tv/playlistDisplay";

type Props = {
  showTimes?: boolean;
  /** When true, show live TV times even if mode is LOCAL (authoritative schedule) */
  forceGlobalTimes?: boolean;
  variant: "activeBatch" | "alternateBatch";
  onSelectChannel: (indexInBatch: number) => void;
};

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

export default function PlaylistTable({
  showTimes,
  forceGlobalTimes,
  variant,
  onSelectChannel,
}: Props) {
  const {
    items,
    alternateBatchItems,
    broadcastEpoch,
    totalDuration,
    mode,
    getSyncedNow,
    liveBroadcastIndex,
  } = useTV();

  const list = variant === "activeBatch" ? items : alternateBatchItems;

  if (!list.length) return null;

  /** Schedule list always follows live broadcast order (not local playback). */
  const activeBatchRotationStart = liveBroadcastIndex;

  const orderedIndices =
    variant === "activeBatch"
      ? forceGlobalTimes
        ? list.map((_, i) => i)
        : buildRotatedScheduleOrder(list.length, activeBatchRotationStart)
      : list.map((_, i) => i);

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

  return (
    <div className="w-full max-w-[330px] overflow-hidden rounded-lg border sm:max-w-[440px]">
      {orderedIndices.map((rowIndex, liveIndex) => {
        const item = list[rowIndex];
        if (!item) return null;

        const isCurrent =
          variant === "activeBatch" && rowIndex === liveBroadcastIndex;

        const showAired =
          variant === "activeBatch" &&
          forceGlobalTimes &&
          rowIndex < liveBroadcastIndex;

        let start = "";
        if (effectiveShowTimes && broadcastEpoch != null) {
          if (variant === "activeBatch" && totalDuration) {
            start = formatPlaylistClock(
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
          } else if (variant === "alternateBatch") {
            const off = cumulativeStartOffsetSeconds(
              alternateBatchItems,
              rowIndex
            );
            start = formatPlaylistClock(
              nextTwelveHourBlockStartMs(broadcastEpoch, now) + off * 1000
            );
          }
        }

        return (
          <div
            key={item.id || liveIndex}
            className="flex flex-col gap-4 space-y-4 border-none"
          >
            <div
              className={`relative mb-6 flex cursor-pointer items-center justify-between gap-4 rounded-md bg-white px-4 py-2 transition-all duration-300 ${isCurrent ? "ring-primary scale-100 shadow-lg ring-4" : "scale-100 ring-4 ring-gray-200"} ${showAired ? "opacity-80" : ""} `}
              onClick={() => onSelectChannel(rowIndex)}
            >
              <div className="flex items-center gap-2">
                {isCurrent && <Bookmark className="-ml-2 size-5" />}

                <div className="space-y-1">
                  <h5 className="text-sm font-medium">
                    {trimTitle(item.channel.title, 20)}
                  </h5>

                  <p className="text-muted-foreground text-[10px]">
                    Host: {item.channel.hostName?.split(" ")[0] || ""}{" "}
                    <span className="text-primary text-[10px] opacity-50">
                      @{item.channel.username || ""}
                    </span>
                  </p>

                  {effectiveShowTimes && (
                    <p className="text-muted-foreground text-[10px]">
                      {showAired && (
                        <span className="mr-1 font-medium text-neutral-500">
                          Aired
                        </span>
                      )}
                      Starts: {start} — Duration: {item.duration}s
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end justify-end gap-1">
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <UsersRound className="size-4" />{" "}
                  <span className="whitespace-nowrap">
                    {item.channel.numOfTips || 0} tips
                  </span>
                </span>

                <p className="w-fit rounded-md bg-gray-200 px-1 py-0.5 text-[10px] text-black">
                  {EVENT_TYPE_LABELS[item.channel.eventType]}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
