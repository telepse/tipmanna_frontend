"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";

import YouTube from "react-youtube";

import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { fetchYoutubeAspectInfo } from "@/lib/youtube-immersive-meta";
import type { YoutubeAspectInfo } from "@/lib/youtube-immersive-meta";
import { getYoutubePlayerVarsChromeless } from "@/lib/youtubePlayerConfig";
import {
  clearYoutubeIframePresentation,
  styleYoutubeIframePresentation,
} from "@/lib/youtube-iframe-presentation";

const PROGRAMMATIC_SUPPRESS_MS = 450;

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
  /**
   * @param notifyUserSeek When true, emits `onUserSeek` (user intent). Sync / drift correction must pass false.
   */
  seekTo: (time: number, notifyUserSeek?: boolean) => void;
  load: (videoId: string, start: number) => void;
}

type Props = {
  videoUrl: string;
  autoplay?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  /** Fires on every PAUSED state (including programmatic). Use for UI sync. */
  onPause?: () => void;
  /** Fires only for user-driven pause (not after load / drift seek / stop). */
  onUserPause?: () => void;
  /** Fires only when `seekTo(time, true)` — user-driven seek. */
  onUserSeek?: (seconds: number) => void;
  onEnd?: () => void;
  /** YouTube player error (see YT.PlayerError) */
  onPlayerError?: (errorCode: number) => void;
  /** YouTube state CUED (5) — new video id is loaded in the player */
  onPlaybackReady?: () => void;
  onMuteChange?: (muted: boolean) => void;
  miniPlayerActive?: boolean;
  cover?: boolean;
  /** Full-size iframe with object-fit contain (portrait / Shorts-style immersive). */
  containFill?: boolean;
  /**
   * After player ready or when a new video is cued (state 5). Dimensions from oEmbed (cached).
   */
  onVideoAspectInfo?: (info: YoutubeAspectInfo) => void;
};

const TvPlayer = forwardRef<TvPlayerRef, Props>(
  (
    {
      videoUrl,
      autoplay = true,
      onReady,
      onPlay,
      onPause,
      onUserPause,
      onUserSeek,
      onEnd,
      onPlayerError,
      onPlaybackReady,
      onMuteChange,
      miniPlayerActive,
      cover,
      containFill,
      onVideoAspectInfo,
    },
    ref
  ) => {
    const playerRef = useRef<YT.Player | null>(null);
    const readyRef = useRef(false);
    const pendingLoadRef = useRef<{ videoId: string; start: number } | null>(
      null
    );
    const suppressUserIntentUntilRef = useRef(0);

    const beginProgrammaticPlayback = useCallback(() => {
      suppressUserIntentUntilRef.current =
        Date.now() + PROGRAMMATIC_SUPPRESS_MS;
    }, []);

    const getReady = useCallback(
      () =>
        readyRef.current &&
        !!playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function",
      []
    );

    useImperativeHandle(
      ref,
      () => ({
        isReady: getReady,

        play: () => playerRef.current?.playVideo(),
        pause: () => playerRef.current?.pauseVideo(),
        stop: () => {
          beginProgrammaticPlayback();
          playerRef.current?.stopVideo();
        },

        mute: () => {
          playerRef.current?.mute();
          onMuteChange?.(true);
        },
        unmute: () => {
          playerRef.current?.unMute();
          onMuteChange?.(false);
        },
        isMuted: () => !!playerRef.current?.isMuted(),

        setVolume: (vol: number) => playerRef.current?.setVolume(vol),
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        getDuration: () => playerRef.current?.getDuration() ?? 0,
        seekTo: (time: number, notifyUserSeek?: boolean) => {
          if (notifyUserSeek) {
            onUserSeek?.(time);
          } else {
            beginProgrammaticPlayback();
          }
          playerRef.current?.seekTo(time, true);
        },

        load: (videoId: string, start: number) => {
          beginProgrammaticPlayback();
          if (readyRef.current && playerRef.current) {
            playerRef.current.loadVideoById(videoId, start);
          } else {
            pendingLoadRef.current = { videoId, start };
          }
        },
      }),
      [getReady, onMuteChange, onUserSeek, beginProgrammaticPlayback]
    );

    const videoId = extractYoutubeID(videoUrl);

    const videoUrlRef = useRef(videoUrl);
    videoUrlRef.current = videoUrl;
    const onVideoAspectInfoRef = useRef(onVideoAspectInfo);
    onVideoAspectInfoRef.current = onVideoAspectInfo;

    const notifyVideoAspect = useCallback(() => {
      const url = videoUrlRef.current;
      void fetchYoutubeAspectInfo(url).then(info => {
        if (info) onVideoAspectInfoRef.current?.(info);
      });
    }, []);

    const youtubeOpts = useMemo(
      () => ({
        width: "100%",
        height:
          cover || containFill ? "100%" : miniPlayerActive ? "100%" : "375px",
        playerVars: getYoutubePlayerVarsChromeless({
          autoplay: autoplay,
          mute: true,
        }) as Record<string, string | number>,
      }),
      [cover, containFill, miniPlayerActive, autoplay]
    );

    useLayoutEffect(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      const iframe = p.getIframe?.();
      if (!iframe) return;
      if (cover) {
        styleYoutubeIframePresentation(iframe, "cover");
      } else if (containFill) {
        styleYoutubeIframePresentation(iframe, "contain");
      } else {
        clearYoutubeIframePresentation(iframe);
      }
    }, [cover, containFill, videoId]);

    return (
      <div
        className={
          cover || containFill
            ? "pointer-events-none relative h-full min-h-0 w-full min-w-0"
            : "pointer-events-none"
        }
      >
        <YouTube
          videoId={videoId ?? undefined}
          opts={youtubeOpts}
          onReady={event => {
            playerRef.current = event.target;
            readyRef.current = true;

            if (cover) {
              styleYoutubeIframePresentation(event.target.getIframe(), "cover");
            } else if (containFill) {
              styleYoutubeIframePresentation(
                event.target.getIframe(),
                "contain"
              );
            }

            if (pendingLoadRef.current) {
              const { videoId: vid, start } = pendingLoadRef.current;
              pendingLoadRef.current = null;
              beginProgrammaticPlayback();
              event.target.loadVideoById(vid, start);
            } else if (autoplay) {
              event.target.playVideo();
            }

            notifyVideoAspect();
            onReady?.();
          }}
          onStateChange={event => {
            if (event.data === 1) onPlay?.();
            if (event.data === 2) {
              onPause?.();
              if (Date.now() >= suppressUserIntentUntilRef.current) {
                onUserPause?.();
              }
            }
            if (event.data === 5) {
              if (cover) {
                styleYoutubeIframePresentation(
                  event.target.getIframe(),
                  "cover"
                );
              } else if (containFill) {
                styleYoutubeIframePresentation(
                  event.target.getIframe(),
                  "contain"
                );
              }
              notifyVideoAspect();
              onPlaybackReady?.();
            }
            if (event.data === 0) onEnd?.();
          }}
          onError={event => onPlayerError?.(event.data as number)}
        />
      </div>
    );
  }
);

TvPlayer.displayName = "TvPlayer";
export default TvPlayer;
