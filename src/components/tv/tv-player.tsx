"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Third-party imports
import YouTube from "react-youtube";

// Local imports
import { extractYoutubeID } from "@/lib/extractYoutubeID";

export interface TvPlayerRef {
  isReady: () => boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
  load: (videoId: string, start: number) => void;
}

type Props = {
  videoUrl: string;
  autoplay?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onMuteChange?: (muted: boolean) => void;
  miniPlayerActive?: boolean;
  cover?: boolean;
};

const TvPlayer = forwardRef<TvPlayerRef, Props>(
  (
    {
      videoUrl,
      autoplay = true,
      onReady,
      onPlay,
      onPause,
      onMuteChange,
      miniPlayerActive,
      cover,
    },
    ref
  ) => {
    const playerRef = useRef<YT.Player | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    const videoId = extractYoutubeID(videoUrl);

    useImperativeHandle(ref, () => ({
      isReady: () =>
        !!playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function",
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      stop: () => playerRef.current?.stopVideo(),
      mute: () => playerRef.current?.mute(),
      unmute: () => playerRef.current?.unMute(),
      isMuted: () => isMuted,
      setVolume: (vol: number) => playerRef.current?.setVolume(vol),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      getDuration: () => playerRef.current?.getDuration() ?? 0,
      seekTo: (time: number) => playerRef.current?.seekTo(time, true),
      load: (videoId: string, start: number) =>
        playerRef.current?.loadVideoById(videoId, start),
    }));

    return (
      <div className="pointer-events-none">
        <YouTube
          videoId={videoId}
          opts={{
            width: "100%",
            // height: miniPlayerActive ? "140px" : "350px",
            height: cover ? "100%" : miniPlayerActive ? "140px" : "350px",
            playerVars: {
              autoplay: autoplay ? 1 : 0,
              mute: 0,
              controls: 0,
              modestbranding: 1,
              rel: 0,
              playsInline: 1,
            },
          }}
          onReady={event => {
            playerRef.current = event.target;

            // make iframe cover container
            if (cover) {
              const iframe = event.target.getIframe();
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.position = "absolute"; // ensure it fills container
              iframe.style.top = "0";
              iframe.style.right = "8px";
              iframe.style.objectFit = "cover";
            }

            if (autoplay) event.target.playVideo();
            onReady?.();
          }}
          onStateChange={event => {
            const muted = event.target.isMuted();
            setIsMuted(muted);
            onMuteChange?.(muted);

            if (event.data === 1) onPlay?.();
            if (event.data === 2) onPause?.();
          }}
        />
      </div>
    );
  }
);

TvPlayer.displayName = "TvPlayer";
export default TvPlayer;
