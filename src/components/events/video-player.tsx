/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
} from "react";

// Local imports
import { extractYoutubeID } from "@/lib/extractYoutubeID";

declare global {
  interface Window {
    YT: YT.Player | null;
    onYouTubeIframeAPIReady: () => void;
  }
}

type Props = {
  videoUrl: string;
  className?: string;
};

export type VideoPlayerRef = {
  isReady: () => boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (time: number) => void;
  getTitle: () => string;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  setvolume: (v: number) => void;
};

const VideoPlayer = forwardRef<VideoPlayerRef, Props>(
  ({ videoUrl, className }, ref) => {
    const playerRef = useRef<YT.Player | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerIdRef = useRef(
      `yt-player-${Math.random().toString(36).slice(2)}`
    );
    const hasUserInteracted = useRef(false);

    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    const videoId = extractYoutubeID(videoUrl);

    const unlockAudio = () => {
      if (!playerRef.current || hasUserInteracted.current) return;

      hasUserInteracted.current = true;
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      setIsMuted(false);
    };

    useEffect(() => {
      const handler = () => unlockAudio();

      window.addEventListener("click", handler, { once: true });
      window.addEventListener("keydown", handler, { once: true });
      window.addEventListener("touchstart", handler, { once: true });

      return () => {
        window.removeEventListener("click", handler);
        window.removeEventListener("keydown", handler);
        window.removeEventListener("touchstart", handler);
      };
    }, []);

    const createPlayer = () => {
      if (!videoId || playerRef.current || !containerRef.current) return;

      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          controls: 1,
          modestbranding: 1,
          autoplay: 1,
          mute: 1,
        },
        events: {
          onReady: (event: YT.PlayerEvent) => {
            if (!loading) return;
            setLoading(false);
            setIsMuted(true);

            event.target.playVideo();
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setLoading(false);
            }
          },
        },
      });
    };

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
      setvolume: (v: number) => playerRef.current?.setVolume(v),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      getDuration: () => playerRef.current?.getDuration() ?? 0,
      seekTo: (t: number) => playerRef.current?.seekTo(t, true),
      getTitle: () => playerRef.current?.getVideoData()?.title ?? "",
    }));

    useEffect(() => {
      if (!videoId) return;

      // If player exists, load the new video
      if (playerRef.current && playerRef.current.loadVideoById) {
        setLoading(true);
        playerRef.current.loadVideoById(videoId);
        return;
      }

      // Otherwise, create new player
      const init = () => requestAnimationFrame(createPlayer);

      if (window.YT?.Player) {
        init();
      } else {
        if (!document.getElementById("youtube-iframe-api")) {
          const tag = document.createElement("script");
          tag.id = "youtube-iframe-api";
          tag.src = "https://www.youtube.com/iframe_api";
          document.body.appendChild(tag);
        }
        window.onYouTubeIframeAPIReady = init;
      }
    }, [videoId]);

    if (!videoId) return <p>Invalid video link</p>;

    return (
      <div className="relative h-full w-full">
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center bg-gray-200 transition-opacity ${
            loading
              ? "pointer-events-none opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          <span className="animate-pulse text-gray-500">Loading video…</span>
        </div>

        <div
          ref={containerRef}
          id={playerIdRef.current}
          className={`h-full w-full object-cover ${className ?? ""}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
