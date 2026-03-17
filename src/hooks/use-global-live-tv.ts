/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Pusher from "pusher-js";

interface LiveTvState {
  channels: any[];
  currentIndex: number;
  videoStartTime: number;
}

export const useGlobalLiveTv = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(Date.now());

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("global-live-tv");
    channel.bind("update", (state: LiveTvState) => {
      setChannels(state.channels);
      setCurrentIndex(state.currentIndex);
      setVideoStartTime(state.videoStartTime);
    });

    return () => {
      pusher.unsubscribe("global-live-tv");
      pusher.disconnect();
    };
  }, []);

  return { channels, currentIndex, videoStartTime };
};
