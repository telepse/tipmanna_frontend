/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

// Third-party imports
import {
  ArrowUp,
  AudioLines,
  Bookmark,
  ChevronDown,
  Share2,
  UsersRound,
} from "lucide-react";

// Local imports
import { getAllEventChannels } from "@/actions/events";
import { Channel } from "@/types/channel.types";
import { trimTitle } from "@/lib/utils";
import { TvLooper } from "./tv-looper";
import { TvPlayerRef } from "./tv-player";

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

export const TVRightSection = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await getAllEventChannels();
      setChannels(data || []);
    };

    load();
  }, []);

  const handleSelectChannel = (index: number) => {
    setCurrentIndex(index);

    // Optional UX polish: scroll up to the player
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [mode, setMode] = useState<"GLOBAL" | "LOCAL">(() => {
    if (typeof window === "undefined") return "GLOBAL";
    return (localStorage.getItem("tv-mode") as any) || "GLOBAL";
  });

  useEffect(() => {
    localStorage.setItem("tv-mode", mode);
  }, [mode]);

  const playerRef = useRef<TvPlayerRef>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [broadcastEpoch, setBroadcastEpoch] = useState<number | null>(null);

  const cursor = 0;

  const [activeTab, setActiveTab] = useState<"playlist" | "tips">("playlist");

  const [isTvDrawerOpen, setIsTvDrawerOpen] = useState(false);
  const [, setDuration] = useState(0);
  const [, setCurrentTime] = useState(0);

  const displayedItems =
    mode === "GLOBAL"
      ? items
      : items.length > 0 && items[currentIndex]
        ? [items[currentIndex], ...items.filter((_, i) => i !== currentIndex)]
        : [];

  useEffect(() => {
    if (!playerRef.current) return;

    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      const current = player.getCurrentTime();
      const total = player.getDuration();

      if (!isNaN(current)) setCurrentTime(current);
      if (!isNaN(total)) setDuration(total);
    }, 500);

    return () => clearInterval(interval);
  }, [currentIndex]);

  useEffect(() => {
    const loadSchedule = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tv/schedule`
      );
      const data = await res.json();

      setItems(data.items);
      setTotalDuration(data.totalDuration);

      const drift = data.serverNow - Date.now();
      setBroadcastEpoch(data.broadcastEpoch - drift);
    };

    loadSchedule();
  }, []);

  return (
    <div className="bg-gray h-fit w-full space-y-4 rounded-2xl p-4">
      <div className="flex items-end justify-end gap-4">
        <div className="flex items-center gap-1">
          <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
          <span className="text-xs font-medium sm:text-sm">{0} online</span>
        </div>

        <Share2 className="size-5" />
      </div>

      {broadcastEpoch && items.length > 0 && totalDuration > 0 && (
        <TvLooper
          broadcastEpoch={broadcastEpoch}
          totalDuration={totalDuration}
          items={items}
          playerRef={playerRef}
          currentIndex={currentIndex}
          mode={mode}
        />
      )}

      <div className="mt-4 flex w-[500px] items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("playlist")}
          className={`break-words-none flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
            activeTab === "playlist"
              ? "bg-black text-white"
              : "bg-white text-black outline-black"
          }`}
        >
          TV Playlist <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tips")}
          className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
            activeTab === "tips"
              ? "bg-black text-white"
              : "bg-white text-black outline-black"
          }`}
        >
          Tips <ChevronDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode("GLOBAL")}
          className={`text-sm whitespace-nowrap ${mode === "GLOBAL" ? "text-destructive underline" : ""}`}
        >
          Live TV
        </button>
        <button
          type="button"
          onClick={() => setMode("LOCAL")}
          className={`text-sm whitespace-nowrap ${mode === "LOCAL" ? "text-success underline" : ""}`}
        >
          Your TV
        </button>
      </div>

      {/* list of channels */}
      {activeTab === "playlist" && (
        <div className="flex max-h-[75vh] w-full flex-col items-start gap-2 overflow-y-auto pb-10">
          <button
            type="button"
            onClick={() => setIsTvDrawerOpen(true)}
            className="mt-4 flex items-center gap-2 text-sm"
          >
            See full schedule <ArrowUp className="size-4" />
          </button>
          <div className="-ml-4 max-h-[35vh] w-full space-y-4 overflow-y-auto p-4">
            {displayedItems
              .filter(Boolean)
              .slice(0, 5)
              .map((item, i) => {
                const originalIndex = items.findIndex(c => c.id === item.id);

                const isPlaying = originalIndex === currentIndex;

                const start = new Date(
                  broadcastEpoch! + cursor * 1000
                ).toLocaleTimeString();

                return (
                  <div
                    key={i}
                    onClick={() => handleSelectChannel(i)}
                    className={`relative flex cursor-pointer items-center justify-between gap-4 rounded-md bg-white px-4 py-2 transition-all duration-300 ${isPlaying ? "ring-primary scale-100 shadow-lg ring-4" : "scale-100 ring-4 ring-gray-200"} `}
                  >
                    <div className="flex items-center gap-2">
                      {isPlaying && <Bookmark className="-ml-2 size-5" />}
                      <div className="space-y-1">
                        <h5 className="text-sm font-medium">
                          {item?.channel?.title
                            ? trimTitle(item.channel.title, 20)
                            : "Loading..."}
                        </h5>

                        <p className="text-muted-foreground text-[10px]">
                          Host:{" "}
                          {item?.channel?.title
                            ? trimTitle(item.channel.title, 20)
                            : "Loading..."}{" "}
                          <span className="text-primary text-[10px] opacity-50">
                            @{item.channel.username || ""}
                          </span>
                        </p>

                        {mode === "GLOBAL" && (
                          <p className="text-muted-foreground text-[10px]">
                            {start}
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

                    {/* SAVE ICON */}
                    {isPlaying && (
                      <div className="absolute -top-4 -right-2 bg-white">
                        <span className="flex">
                          <AudioLines className="text-primary wave-icon" />
                          <AudioLines className="text-primary wave-icon" />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
