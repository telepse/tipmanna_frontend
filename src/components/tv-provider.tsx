/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { TvPlayerRef } from "@/components/tv/tv-player";
import { resolveBroadcastState } from "@/lib/broadcastEngine";
import { preloadVideos } from "@/lib/preloadManager";
import { extractYoutubeID } from "@/lib/extractYoutubeID";

type TVContextType = {
  items: any[];
  broadcastEpoch: number | null;
  totalDuration: number;

  mode: "GLOBAL" | "LOCAL";
  setMode: (m: "GLOBAL" | "LOCAL") => void;

  currentIndex: number;
  setCurrentIndex: (i: number) => void;

  playerRef: React.RefObject<TvPlayerRef>;
};

const TVContext = createContext<TVContextType | null>(null);

export function useTV() {
  const ctx = useContext(TVContext);
  if (!ctx) throw new Error("GlobalTVProvider missing");
  return ctx;
}

export default function GlobalTVProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const playerRef = useRef<TvPlayerRef>(null);

  const [items, setItems] = useState<any[]>([]);
  const [broadcastEpoch, setBroadcastEpoch] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);

  const [mode, setMode] = useState<"GLOBAL" | "LOCAL">(() => {
    if (typeof window === "undefined") return "GLOBAL";
    return (localStorage.getItem("tv-mode") as any) || "GLOBAL";
  });

  useEffect(() => {
    localStorage.setItem("tv-mode", mode);
  }, [mode]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Load schedule
  useEffect(() => {
    async function load() {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tv/schedule`
      );
      const data = await res.json();

      setItems(data.items);
      setBroadcastEpoch(data.broadcastEpoch);
      setTotalDuration(data.totalDuration);
    }
    load();
  }, []);

  useEffect(() => {
    preloadVideos(items, currentIndex);
  }, [currentIndex]);

  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!broadcastEpoch || !items.length || totalDuration === 0) return;

    const interval = setInterval(() => {
      const state = resolveBroadcastState(broadcastEpoch, totalDuration, items);

      const item = items[state.index];

      if (!item) return;

      playerRef.current?.load(extractYoutubeID(item.channel.url), state.offset);

      setCurrentIndex(state.index);
    }, 3000);

    return () => clearInterval(interval);
  }, [broadcastEpoch, items, totalDuration]);

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handler = () => {
      playerRef.current?.stop();
      setVisible(false);
    };

    window.addEventListener("tv-page-open", handler);
    return () => window.removeEventListener("tv-page-open", handler);
  }, []);

  return (
    <TVContext.Provider
      value={{
        items,
        broadcastEpoch,
        totalDuration,
        mode,
        setMode,
        currentIndex,
        setCurrentIndex,
        playerRef: playerRef as React.RefObject<TvPlayerRef>,
      }}
    >
      {children}
    </TVContext.Provider>
  );
}
