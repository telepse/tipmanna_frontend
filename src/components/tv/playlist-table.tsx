/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { resolveBroadcastPosition } from "@/lib/broadcast-resolver";
import { trimTitle } from "@/lib/utils";
import { Bookmark, UsersRound } from "lucide-react";
import { useTV } from "../tv-provider";

type Props = {
  broadcastEpoch: number;
  items: any[];
  showTimes?: boolean;
  onSelectChannel: (i: number) => void;
  totalDuration: number;
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONCERT_MUSIC: "Concert",
  DRAMA_ART: "Drama",
  FESTVAL: "Festival",
  CULTINERY: "Food",
  HANG_OUT: "Hangout",
  ISLAMIC: "Islamic",
  CHRISTIAN: "Christian",
  CORPORATE: "Corporate",
  COMEDY: "Comedy",
  FASHION: "Fashion",
  GAME_SPORT: "Game & Sport",
  OTHER: "Other",
};

export default function PlaylistTable({
  broadcastEpoch,
  items,
  showTimes,
  onSelectChannel,
  totalDuration,
}: Props) {
  let cursor = 0;
  const { currentIndex } = useTV();

  const sorted = [
    items[currentIndex],
    ...items.filter((_, i) => i !== currentIndex),
  ];

  return (
    <div className="w-[330px] overflow-hidden rounded-lg border">
      {sorted.filter(Boolean).map((item, liveIndex) => {
        const originalIndex = items.findIndex(i => i.id === item.id);

        const start = new Date(
          broadcastEpoch + cursor * 1000
        ).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

        const { index } = resolveBroadcastPosition(
          broadcastEpoch,
          totalDuration,
          items
        );

        cursor += item.duration;

        const isCurrent = currentIndex === originalIndex;

        return (
          <>
            <div className="flex flex-col gap-4 space-y-4 border-none">
              <div
                key={item.id}
                className={`relative mb-6 flex cursor-pointer items-center justify-between gap-4 rounded-md bg-white px-4 py-2 transition-all duration-300 ${isCurrent ? "ring-primary scale-100 shadow-lg ring-4" : "scale-100 ring-4 ring-gray-200"} `}
                onClick={() => onSelectChannel(originalIndex)}
              >
                <div className="flex items-center gap-2">
                  {isCurrent && <Bookmark className="-ml-2 size-5" />}

                  <div className="space-y-1">
                    <h5 className="text-sm font-medium">
                      {trimTitle(item.channel.title, 20)}
                    </h5>

                    <p className="tetx-muted-foreground text-[10px]">
                      Host: {item.channel.hostName.split(" ")[0]}{" "}
                      <span className="text-primary text-[10px] opacity-50">
                        @{item.channel.username || ""}
                      </span>
                    </p>

                    <p className="text-muted-foreground text-[10px]">
                      Starts: {start} - Duration: {item.duration}s
                    </p>
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

                  <div className="space-y-1"></div>
                </div>
              </div>
            </div>
          </>
        );
      })}
    </div>
  );
}
