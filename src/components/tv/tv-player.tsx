"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useEffect,
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
import {
  tracePlayVideoResult,
  tvLoadMark,
  tvTrace,
  ytStateName,
} from "@/lib/tvDebugLog";
import { notifyTvFirstPlay } from "@/lib/tv-post-ttfv-idle";
import {
  hashShortId,
  isTvStartupTraceEnabled,
  tvStartupEvent,
  updateTvStartupContext,
} from "@/lib/tv-startup-trace";

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
  /** Current YouTube player state name (PLAYING, BUFFERING, …) or null. */
  getPlayerState: () => string | null;
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
  /** Phase C1 — embed-time start offset (playerVars.start). Fixed at mount. */
  initialStartSeconds?: number;
  /** Phase C1 — startup embed generation for stale callback rejection. */
  startupGeneration?: number;
  initialSelectedIndex?: number;
  embedSource?: "global" | "community";
  embedReason?: string;
  targetWasResolved?: boolean;
  enableLiveOffsetEmbed?: boolean;
  onInitialEmbedCommitted?: (payload: {
    videoId: string;
    startOffsetSeconds: number;
    selectedIndex: number;
    startupGeneration: number;
  }) => void;
  onInitialEmbedConfirmed?: (payload: { startupGeneration: number }) => void;
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
      initialStartSeconds = 0,
      startupGeneration = 1,
      initialSelectedIndex = 0,
      embedSource = "global",
      embedReason = "cold_start",
      targetWasResolved = false,
      enableLiveOffsetEmbed = false,
      onInitialEmbedCommitted,
      onInitialEmbedConfirmed,
    },
    ref
  ) => {
    const playerRef = useRef<YT.Player | null>(null);
    const readyRef = useRef(false);
    const pendingLoadRef = useRef<{ videoId: string; start: number } | null>(
      null
    );
    const suppressUserIntentUntilRef = useRef(0);
    const aspectFetchedRef = useRef(false);
    const mountedVideoIdRef = useRef<string | undefined>(
      extractYoutubeID(videoUrl) ?? undefined
    );
    const mountedStartSecondsRef = useRef(
      enableLiveOffsetEmbed ? Math.max(0, Math.floor(initialStartSeconds)) : 0
    );
    const initialEmbedTracedRef = useRef(false);
    const initialEmbedCommittedRef = useRef(false);

    /**
     * Diagnostic-only (no behaviour change): record player mount + earliest
     * reliable observation that the YouTube IFrame API object exists. react-youtube
     * loads the API script internally, so exact script-load time is not observable
     * through the library; we emit the closest reliable signal (window.YT.Player
     * present) and mark it approximate. Active only when tracing is enabled.
     */
    useEffect(() => {
      tvStartupEvent("player_component_mounted", {
        trigger: externallyControlled ? "external" : "internal",
        data: { videoIdHash: hashShortId(mountedVideoIdRef.current ?? null) },
      });
      if (mountedVideoIdRef.current && !initialEmbedTracedRef.current) {
        initialEmbedTracedRef.current = true;
        tvStartupEvent("initial_embed_created", {
          trigger: enableLiveOffsetEmbed ? "live_offset_embed" : "initial_embed",
          data: {
            videoIdHash: hashShortId(mountedVideoIdRef.current),
            startOffsetSeconds: mountedStartSecondsRef.current,
            startupGeneration,
            source: embedSource,
            reason: embedReason,
            targetWasResolved: enableLiveOffsetEmbed && targetWasResolved,
          },
        });
      }

      if (
        enableLiveOffsetEmbed &&
        mountedVideoIdRef.current &&
        !initialEmbedCommittedRef.current &&
        onInitialEmbedCommitted
      ) {
        initialEmbedCommittedRef.current = true;
        onInitialEmbedCommitted({
          videoId: mountedVideoIdRef.current,
          startOffsetSeconds: mountedStartSecondsRef.current,
          selectedIndex: initialSelectedIndex,
          startupGeneration,
        });
      }

      if (!isTvStartupTraceEnabled()) return;

      const w = window as unknown as { YT?: { Player?: unknown } };
      const emitApi = (approx: boolean) =>
        tvStartupEvent("youtube_api_available", {
          canonicalMark: "T7",
          reason: approx ? "yt_object_detected" : "yt_object_present_at_mount",
          data: { approximate: true },
        });

      if (w.YT && w.YT.Player) {
        emitApi(false);
        return;
      }
      let done = false;
      const id = setInterval(() => {
        if (done) return;
        if (w.YT && w.YT.Player) {
          done = true;
          clearInterval(id);
          emitApi(true);
        }
      }, 200);
      // Bounded so the poll cannot linger; onReady will supersede regardless.
      const stop = setTimeout(() => {
        done = true;
        clearInterval(id);
      }, 20_000);
      return () => {
        done = true;
        clearInterval(id);
        clearTimeout(stop);
      };
    }, [
      externallyControlled,
      enableLiveOffsetEmbed,
      startupGeneration,
      embedSource,
      embedReason,
      targetWasResolved,
      initialSelectedIndex,
      onInitialEmbedCommitted,
    ]);

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

    const maybeNotifyVideoAspectOnce = useCallback(() => {
      if (aspectFetchedRef.current) return;
      aspectFetchedRef.current = true;
      notifyVideoAspect();
    }, [notifyVideoAspect]);

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
        getPlayerState: () => {
          const p = playerRef.current;
          if (!p || typeof p.getPlayerState !== "function") return null;
          return ytStateName(p.getPlayerState() as number);
        },
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
      [
        getReady,
        onMuteChange,
        onUserSeek,
        beginProgrammaticPlayback,
        syncMuteFromPlayer,
      ]
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
          start: enableLiveOffsetEmbed
            ? mountedStartSecondsRef.current
            : undefined,
        }) as Record<string, string | number>,
      }),
      [cover, containFill, miniPlayerActive, autoplay, enableLiveOffsetEmbed]
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
            tvLoadMark("T5", {
              videoId: extractYoutubeID(videoUrlRef.current),
            });
            updateTvStartupContext({ playerReady: true, playerState: "READY" });
            tvStartupEvent("player_ready", {
              canonicalMark: "T8",
              trigger: "youtube_onReady",
              data: { externallyControlled },
            });

            if (enableLiveOffsetEmbed && onInitialEmbedConfirmed) {
              onInitialEmbedConfirmed({ startupGeneration });
            }

            syncMuteFromPlayer(event.target);
            onReady?.();
          }}
          onStateChange={event => {
            tvTrace("playback", "onStateChange", {
              state: event.data,
              stateName: ytStateName(event.data as number),
              videoId: extractYoutubeID(videoUrlRef.current),
            });
            updateTvStartupContext({
              playerState: ytStateName(event.data as number),
            });
            if (event.data === 3) {
              tvStartupEvent("player_buffering", {
                canonicalMark: "T10",
                trigger: "youtube_state_3",
              });
            }
            if (event.data === 1) {
              syncMuteFromPlayer(event.target);
              tvTrace("playback", "onPlay", {
                videoId: extractYoutubeID(videoUrlRef.current),
              });
              tvLoadMark("T6", {
                videoId: extractYoutubeID(videoUrlRef.current),
              });
              tvStartupEvent("player_playing", {
                canonicalMark: "T11",
                trigger: "youtube_state_1",
              });
              notifyTvFirstPlay();
              maybeNotifyVideoAspectOnce();
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
