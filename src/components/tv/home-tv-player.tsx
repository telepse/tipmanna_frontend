"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import YouTube from "react-youtube";
import type { YouTubeEvent } from "react-youtube";

import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  isYoutubePlayerApiReady,
  safeYoutubeCall,
} from "@/lib/tv/youtube-player-safe";
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
  getTvStartupTraceId,
  isTvStartupTraceEnabled,
  tvStartupEvent,
  updateTvStartupContext,
} from "@/lib/tv-startup-trace";
import {
  attachIframeInsertionObserver,
  ensureApiObjectDetectedAtReady,
  isTvYoutubeBootstrapTraceActive,
  recordApiObjectDetected,
  recordPlayerCommitted,
  recordReactYoutubeContainerCommitted,
} from "@/lib/tv-youtube-bootstrap-trace";
import { isTvEarlyYoutubeApiWarmupEnabled } from "@/lib/tv-feature-flags";
import {
  getTvYoutubeApiWarmupPromise,
  getTvYoutubeApiWarmupRemainingMs,
  recordYoutubeApiPresentAtReactYoutubeMount,
  recordYoutubeChildMountDeferred,
  recordYoutubeChildMountReleased,
} from "@/lib/tv-youtube-api-warmup";
import { isYoutubeIframeApiReady } from "@/lib/youtube-iframe-api-loader";

const PROGRAMMATIC_SUPPRESS_MS = 450;

type YouTubePlayer = YouTubeEvent["target"];

export interface HomeTvPlayerRef {
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

const HomeTvPlayer = forwardRef<HomeTvPlayerRef, Props>(
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
    const playerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
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
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const bootstrapLayoutDoneRef = useRef(false);
    const apiPollStartRef = useRef<number | null>(null);
    const youtubeChildGenerationRef = useRef(startupGeneration);

    const [youtubeChildReleased, setYoutubeChildReleased] = useState(() => {
      if (!isTvEarlyYoutubeApiWarmupEnabled()) return true;
      return isYoutubeIframeApiReady();
    });

    useEffect(() => {
      if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
      if (youtubeChildReleased) return;

      recordYoutubeChildMountDeferred({ startupGeneration });

      const generation = startupGeneration;
      let cancelled = false;

      const release = (
        reason:
          | "api_ready"
          | "warmup_resolved"
          | "absolute_deadline"
          | "warmup_failed"
      ) => {
        if (cancelled) return;
        if (youtubeChildGenerationRef.current !== generation) return;
        setYoutubeChildReleased(true);
        recordYoutubeChildMountReleased({
          startupGeneration: generation,
          fallbackReason: reason,
        });
      };

      if (isYoutubeIframeApiReady()) {
        release("api_ready");
        return;
      }

      const promise = getTvYoutubeApiWarmupPromise();
      if (promise) {
        void promise.then(result => {
          if (result.state === "ready") {
            release("warmup_resolved");
          } else {
            release("warmup_failed");
          }
        });
      }

      const remaining = getTvYoutubeApiWarmupRemainingMs();
      let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
      if (remaining != null) {
        if (remaining <= 0) {
          release("absolute_deadline");
        } else {
          deadlineTimer = setTimeout(() => {
            release("absolute_deadline");
          }, remaining);
        }
      }

      return () => {
        cancelled = true;
        if (deadlineTimer != null) clearTimeout(deadlineTimer);
      };
    }, [startupGeneration, youtubeChildReleased]);

    useEffect(() => {
      youtubeChildGenerationRef.current = startupGeneration;
    }, [startupGeneration]);

    useEffect(() => {
      if (!youtubeChildReleased) return;
      if (!isTvEarlyYoutubeApiWarmupEnabled()) return;
      recordYoutubeApiPresentAtReactYoutubeMount(isYoutubeIframeApiReady());
    }, [youtubeChildReleased]);

    useLayoutEffect(() => {
      if (bootstrapLayoutDoneRef.current) return;
      bootstrapLayoutDoneRef.current = true;

      recordPlayerCommitted({
        startupGeneration,
        source: embedSource,
        traceId: getTvStartupTraceId(),
      });
      recordReactYoutubeContainerCommitted({
        startupGeneration,
        source: embedSource,
        traceId: getTvStartupTraceId(),
      });

      const container = playerContainerRef.current;
      if (container) {
        attachIframeInsertionObserver({
          container,
          startupGeneration,
          source: embedSource,
          traceId: getTvStartupTraceId(),
        });
      }
    }, [startupGeneration, embedSource]);

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
          trigger: enableLiveOffsetEmbed
            ? "live_offset_embed"
            : "initial_embed",
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
        if (isTvYoutubeBootstrapTraceActive()) {
          recordApiObjectDetected({
            detectionReason: "present_at_mount_effect",
            pollDelayMs: 0,
            apiAlreadyPresent: true,
            startupGeneration,
            traceId: getTvStartupTraceId(),
          });
        }
        return;
      }
      apiPollStartRef.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      let done = false;
      const id = setInterval(() => {
        if (done) return;
        if (w.YT && w.YT.Player) {
          done = true;
          clearInterval(id);
          emitApi(true);
          if (isTvYoutubeBootstrapTraceActive()) {
            const pollStart = apiPollStartRef.current ?? performance.now();
            recordApiObjectDetected({
              detectionReason: "poll_detected",
              pollDelayMs: performance.now() - pollStart,
              apiAlreadyPresent: false,
              startupGeneration,
              traceId: getTvStartupTraceId(),
            });
          }
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
      () => isYoutubePlayerApiReady(readyRef.current, playerRef.current),
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

    const syncMuteFromPlayer = useCallback((target?: YouTubePlayer | null) => {
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
          safeYoutubeCall(() => {
            const result = playerRef.current?.playVideo();
            tracePlayVideoResult("TvPlayer.play", result);
          }, undefined);
        },
        pause: () =>
          safeYoutubeCall(() => playerRef.current?.pauseVideo(), undefined),
        stop: () => {
          beginProgrammaticPlayback();
          safeYoutubeCall(() => playerRef.current?.stopVideo(), undefined);
        },

        mute: () => {
          safeYoutubeCall(() => playerRef.current?.mute(), undefined);
          tvTrace("autoplay", "mute", { source: "TvPlayer.mute" });
          onMuteChange?.(true);
        },
        unmute: () => {
          safeYoutubeCall(() => playerRef.current?.unMute(), undefined);
          tvTrace("autoplay", "unmute", { source: "TvPlayer.unmute" });
          onMuteChange?.(false);
        },
        isMuted: () =>
          safeYoutubeCall(() => !!playerRef.current?.isMuted(), true),
        syncMuteFromPlayer: () => syncMuteFromPlayer(),

        setVolume: (vol: number) =>
          safeYoutubeCall(() => playerRef.current?.setVolume(vol), undefined),
        getCurrentTime: () =>
          safeYoutubeCall(() => playerRef.current?.getCurrentTime() ?? 0, 0),
        getDuration: () =>
          safeYoutubeCall(() => playerRef.current?.getDuration() ?? 0, 0),
        getPlayerState: () => {
          return safeYoutubeCall(() => {
            const p = playerRef.current;
            if (!p || typeof p.getPlayerState !== "function") return null;
            return ytStateName(p.getPlayerState() as number);
          }, null);
        },
        seekTo: (time: number, notifyUserSeek?: boolean) => {
          if (notifyUserSeek) {
            onUserSeek?.(time);
          } else {
            beginProgrammaticPlayback();
          }
          safeYoutubeCall(
            () => playerRef.current?.seekTo(time, true),
            undefined
          );
        },

        load: (videoId: string, start: number) => {
          tvTrace("playback", "player_load", { videoId, start });
          beginProgrammaticPlayback();
          if (getReady() && playerRef.current) {
            safeYoutubeCall(() => {
              playerRef.current!.loadVideoById(videoId, start);
              if (playerRef.current!.isMuted()) {
                tracePlayVideoResult(
                  "TvPlayer.load.muted_play",
                  playerRef.current!.playVideo()
                );
              }
            }, undefined);
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
        ref={playerContainerRef}
        className={
          cover || containFill
            ? "pointer-events-none relative h-full min-h-0 w-full min-w-0"
            : "pointer-events-none"
        }
      >
        {youtubeChildReleased && youtubeVideoId ? (
          <YouTube
            videoId={youtubeVideoId}
            opts={youtubeOpts}
            onReady={event => {
              playerRef.current = event.target;
              readyRef.current = true;

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
              updateTvStartupContext({
                playerReady: true,
                playerState: "READY",
              });
              ensureApiObjectDetectedAtReady({
                startupGeneration,
                traceId: getTvStartupTraceId(),
              });
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
        ) : null}
        <YoutubeChromeMask />
      </div>
    );
  }
);

HomeTvPlayer.displayName = "HomeTvPlayer";
export default HomeTvPlayer;
