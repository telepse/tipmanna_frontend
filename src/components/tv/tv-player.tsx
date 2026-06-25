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
import {
  getYoutubePlayerVarsChromeless,
  YOUTUBE_NO_COOKIE_HOST,
} from "@/lib/youtubePlayerConfig";
import {
  clearYoutubeIframePresentation,
  styleYoutubeIframePresentation,
} from "@/lib/youtube-iframe-presentation";
import { YoutubeChromeMask } from "@/components/youtube-chrome-mask";
import { tracePlayVideoResult, tvTrace, ytStateName } from "@/lib/tvDebugLog";

const PROGRAMMATIC_SUPPRESS_MS = 450;

export interface TvPlayerRef {
  isReady: () => boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  syncMuteFromPlayer: () => void;
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
  /**
   * When true, react-youtube videoId is fixed at mount; provider drives loads via ref.load() only.
   */
  externallyControlled?: boolean;
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
      externallyControlled = false,
    },
    ref
  ) => {
    const playerRef = useRef<YT.Player | null>(null);
    const readyRef = useRef(false);
    const pendingLoadRef = useRef<{ videoId: string; start: number } | null>(
      null
    );
    const suppressUserIntentUntilRef = useRef(0);
    const mountedVideoIdRef = useRef<string | undefined>(
      extractYoutubeID(videoUrl) ?? undefined
    );

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

    const videoId = extractYoutubeID(videoUrl);
    const youtubeVideoId = externallyControlled
      ? mountedVideoIdRef.current
      : (videoId ?? undefined);

    const videoUrlRef = useRef(videoUrl);
    videoUrlRef.current = videoUrl;
    const onVideoAspectInfoRef = useRef(onVideoAspectInfo);
    onVideoAspectInfoRef.current = onVideoAspectInfo;
    const onMuteChangeRef = useRef(onMuteChange);
    onMuteChangeRef.current = onMuteChange;

    const syncMuteFromPlayer = useCallback((target?: YT.Player | null) => {
      const p = target ?? playerRef.current;
      if (!p || typeof p.isMuted !== "function") return;
      onMuteChangeRef.current?.(p.isMuted());
    }, []);

    const notifyVideoAspect = useCallback(() => {
      const url = videoUrlRef.current;
      void fetchYoutubeAspectInfo(url).then(info => {
        if (info) onVideoAspectInfoRef.current?.(info);
      });
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        isReady: getReady,

        play: () => {
          const result = playerRef.current?.playVideo();
          tracePlayVideoResult("TvPlayer.play", result);
        },
        pause: () => playerRef.current?.pauseVideo(),
        stop: () => {
          beginProgrammaticPlayback();
          playerRef.current?.stopVideo();
        },

        mute: () => {
          playerRef.current?.mute();
          tvTrace("autoplay", "mute", { source: "TvPlayer.mute" });
          onMuteChange?.(true);
        },
        unmute: () => {
          playerRef.current?.unMute();
          tvTrace("autoplay", "unmute", { source: "TvPlayer.unmute" });
          onMuteChange?.(false);
        },
        isMuted: () => !!playerRef.current?.isMuted(),
        syncMuteFromPlayer: () => syncMuteFromPlayer(),

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
          tvTrace("playback", "player_load", { videoId, start });
          beginProgrammaticPlayback();
          if (readyRef.current && playerRef.current) {
            playerRef.current.loadVideoById(videoId, start);
            if (playerRef.current.isMuted()) {
              tracePlayVideoResult(
                "TvPlayer.load.muted_play",
                playerRef.current.playVideo()
              );
            }
          } else {
            pendingLoadRef.current = { videoId, start };
          }
        },
      }),
      [getReady, onMuteChange, onUserSeek, beginProgrammaticPlayback]
    );

    const youtubeOpts = useMemo(
      () => ({
        host: YOUTUBE_NO_COOKIE_HOST,
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
    }, [cover, containFill, youtubeVideoId]);

    return (
      <div
        className={
          cover || containFill
            ? "pointer-events-none relative h-full min-h-0 w-full min-w-0"
            : "pointer-events-none"
        }
      >
        <YouTube
          videoId={youtubeVideoId}
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
              tvTrace("playback", "player_load_pending", {
                videoId: vid,
                start,
              });
              event.target.loadVideoById(vid, start);
              if (event.target.isMuted()) {
                tracePlayVideoResult(
                  "TvPlayer.onReady.pending_muted_play",
                  event.target.playVideo()
                );
              }
            } else if (autoplay && !externallyControlled) {
              tracePlayVideoResult(
                "TvPlayer.onReady.autoplay",
                event.target.playVideo()
              );
            }

            tvTrace("playback", "onReady", {
              videoId: extractYoutubeID(videoUrlRef.current),
              externallyControlled,
            });

            notifyVideoAspect();
            syncMuteFromPlayer(event.target);
            onReady?.();
          }}
          onStateChange={event => {
            tvTrace("playback", "onStateChange", {
              state: event.data,
              stateName: ytStateName(event.data as number),
              videoId: extractYoutubeID(videoUrlRef.current),
            });
            if (event.data === 1) {
              syncMuteFromPlayer(event.target);
              tvTrace("playback", "onPlay", {
                videoId: extractYoutubeID(videoUrlRef.current),
              });
              onPlay?.();
            }
            if (event.data === 2) {
              syncMuteFromPlayer(event.target);
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
              syncMuteFromPlayer(event.target);
              tvTrace("playback", "onPlaybackReady", {
                videoId: extractYoutubeID(videoUrlRef.current),
              });
              if (
                event.target.isMuted() &&
                event.target.getPlayerState() !== 1
              ) {
                tracePlayVideoResult(
                  "TvPlayer.cued_muted_play",
                  event.target.playVideo()
                );
              }
              onPlaybackReady?.();
            }
            if (event.data === 0) onEnd?.();
          }}
          onError={event => onPlayerError?.(event.data as number)}
        />
        <YoutubeChromeMask />
      </div>
    );
  }
);

TvPlayer.displayName = "TvPlayer";
export default TvPlayer;
