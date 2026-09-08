"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  isYoutubePlayerCommandReady,
  isYoutubePlayerIframeLive,
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
import {
  onYoutubeIframeApiReady,
  isYoutubeIframeApiReady,
} from "@/lib/youtube-iframe-api-loader";
import {
  shouldAcceptTvPlayerYtCallback,
  shouldForceEmbedRemount,
  shouldReplaceTvYtPlayer,
  shouldReuseExistingTvYtPlayer,
  TV_EMBED_ONREADY_TIMEOUT_MS,
} from "@/lib/tv-player-resume";

const PROGRAMMATIC_SUPPRESS_MS = 450;

type YtPlayerLike = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
  setVolume?: (n: number) => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  getPlayerState?: () => number;
  getIframe?: () => HTMLIFrameElement;
  loadVideoById?: (videoId: string, start?: number) => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  destroy?: () => void;
};

type YtApiWindow = Window & {
  YT?: {
    Player: new (
      elementId: string,
      options: Record<string, unknown>
    ) => YtPlayerLike;
  };
};

const getYtWindow = (): YtApiWindow | undefined => {
  if (typeof window === "undefined") return undefined;
  return window as YtApiWindow;
};

export interface TvPlayerRef {
  isReady: () => boolean;
  isIframeLive?: () => boolean;
  play: () => void;
  pause: () => void;
  pauseProgrammatic: () => void;
  stop: () => void;
  mute: () => void;
  unmute: () => void;
  isMuted: () => boolean;
  syncMuteFromPlayer: () => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => string | null;
  seekTo: (time: number, notifyUserSeek?: boolean) => void;
  load: (videoId: string, start: number) => void;
}

type Props = {
  videoUrl: string;
  autoplay?: boolean;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onUserPause?: () => void;
  onUserSeek?: (seconds: number) => void;
  onEnd?: () => void;
  onPlayerError?: (errorCode: number) => void;
  onPlaybackReady?: () => void;
  onMuteChange?: (muted: boolean) => void;
  miniPlayerActive?: boolean;
  cover?: boolean;
  containFill?: boolean;
  onVideoAspectInfo?: (info: YoutubeAspectInfo) => void;
  externallyControlled?: boolean;
  initialStartSeconds?: number;
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
    const playerRef = useRef<YtPlayerLike | null>(null);
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
    const shellRef = useRef<HTMLDivElement>(null);
    const containerMountRef = useRef<HTMLDivElement | null>(null);
    const bootstrapLayoutDoneRef = useRef(false);
    const apiPollStartRef = useRef<number | null>(null);
    const playerIdRef = useRef(
      `tv-yt-${startupGeneration}-${Math.random().toString(36).slice(2, 9)}`
    );
    const destroyedRef = useRef(false);
    const constructedKeyRef = useRef<string | null>(null);
    const startupGenerationRef = useRef(startupGeneration);
    startupGenerationRef.current = startupGeneration;

    const [youtubeChildReleased, setYoutubeChildReleased] = useState(() => {
      if (!isTvEarlyYoutubeApiWarmupEnabled()) return true;
      return isYoutubeIframeApiReady();
    });

    const coverRef = useRef(cover);
    coverRef.current = cover;
    const containFillRef = useRef(containFill);
    containFillRef.current = containFill;
    const fillStage = cover || containFill || miniPlayerActive;

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

      const container = shellRef.current;
      if (container) {
        attachIframeInsertionObserver({
          container,
          startupGeneration,
          source: embedSource,
          traceId: getTvStartupTraceId(),
        });
      }
    }, [startupGeneration, embedSource]);

    const beginProgrammaticPlayback = useCallback(() => {
      suppressUserIntentUntilRef.current =
        Date.now() + PROGRAMMATIC_SUPPRESS_MS;
    }, []);

    const getReady = useCallback(
      () => isYoutubePlayerCommandReady(readyRef.current, playerRef.current),
      []
    );

    const extractedVideoId = extractYoutubeID(videoUrl);
    if (
      externallyControlled &&
      !mountedVideoIdRef.current &&
      extractedVideoId
    ) {
      mountedVideoIdRef.current = extractedVideoId;
    }
    const youtubeVideoId = externallyControlled
      ? mountedVideoIdRef.current
      : (extractedVideoId ?? undefined);

    const videoUrlRef = useRef(videoUrl);
    videoUrlRef.current = videoUrl;
    const onVideoAspectInfoRef = useRef(onVideoAspectInfo);
    onVideoAspectInfoRef.current = onVideoAspectInfo;
    const onMuteChangeRef = useRef(onMuteChange);
    onMuteChangeRef.current = onMuteChange;
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const onPlayRef = useRef(onPlay);
    onPlayRef.current = onPlay;
    const onPauseRef = useRef(onPause);
    onPauseRef.current = onPause;
    const onUserPauseRef = useRef(onUserPause);
    onUserPauseRef.current = onUserPause;
    const onPlaybackReadyRef = useRef(onPlaybackReady);
    onPlaybackReadyRef.current = onPlaybackReady;
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;
    const onPlayerErrorRef = useRef(onPlayerError);
    onPlayerErrorRef.current = onPlayerError;
    const autoplayRef = useRef(autoplay);
    autoplayRef.current = autoplay;
    const externallyControlledRef = useRef(externallyControlled);
    externallyControlledRef.current = externallyControlled;
    const enableLiveOffsetEmbedRef = useRef(enableLiveOffsetEmbed);
    enableLiveOffsetEmbedRef.current = enableLiveOffsetEmbed;
    const onInitialEmbedConfirmedRef = useRef(onInitialEmbedConfirmed);
    onInitialEmbedConfirmedRef.current = onInitialEmbedConfirmed;

    const syncMuteFromPlayer = useCallback((target?: YtPlayerLike | null) => {
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

    const applyIframePresentationToTarget = useCallback(
      (target: YtPlayerLike) => {
        const iframe = target.getIframe?.();
        if (!iframe) return;
        if (coverRef.current) {
          styleYoutubeIframePresentation(iframe, "cover");
        } else if (containFillRef.current) {
          styleYoutubeIframePresentation(iframe, "contain");
        } else {
          clearYoutubeIframePresentation(iframe);
        }
      },
      []
    );

    const allocatePlayerId = useCallback((generation: number) => {
      playerIdRef.current = `tv-yt-${generation}-${Math.random().toString(36).slice(2, 9)}`;
    }, []);

    const teardownImperativeMount = useCallback(() => {
      destroyedRef.current = true;
      readyRef.current = false;
      const p = playerRef.current;
      playerRef.current = null;
      safeYoutubeCall(() => p?.destroy?.(), undefined);
      const mount = containerMountRef.current;
      if (mount?.parentNode) {
        mount.parentNode.removeChild(mount);
      }
      containerMountRef.current = null;
    }, []);

    const ensureImperativeMount = useCallback((): HTMLDivElement | null => {
      const shell = shellRef.current;
      if (!shell) return null;
      if (containerMountRef.current) return containerMountRef.current;
      const mount = document.createElement("div");
      mount.id = playerIdRef.current;
      mount.className = "h-full w-full";
      Object.assign(mount.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      });
      shell.appendChild(mount);
      containerMountRef.current = mount;
      return mount;
    }, []);

    useEffect(() => {
      if (!youtubeChildReleased || !youtubeVideoId) return;

      const constructKey = `${startupGeneration}:${youtubeVideoId}`;
      const reuse = shouldReuseExistingTvYtPlayer({
        hasPlayer: !!playerRef.current,
        constructKey,
        constructedKey: constructedKeyRef.current,
      });

      if (
        !reuse &&
        shouldReplaceTvYtPlayer({
          hasPlayer: !!playerRef.current,
          constructKey,
          constructedKey: constructedKeyRef.current,
        })
      ) {
        teardownImperativeMount();
        allocatePlayerId(startupGeneration);
      }

      destroyedRef.current = false;
      constructedKeyRef.current = constructKey;

      let alive = true;
      let raf = 0;
      let offReady: (() => void) | undefined;
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      let remountCount = 0;
      let constructStartedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      const clearWatchdog = () => {
        if (watchdog != null) {
          clearTimeout(watchdog);
          watchdog = undefined;
        }
      };

      const scheduleOnReadyWatchdog = () => {
        clearWatchdog();
        watchdog = setTimeout(() => {
          if (!alive) return;
          if (
            !shouldForceEmbedRemount({
              youtubeChildReleased: true,
              hasVideoId: true,
              onReadyFired: readyRef.current,
              elapsedMs:
                (typeof performance !== "undefined"
                  ? performance.now()
                  : Date.now()) - constructStartedAt,
              remountCount,
            })
          ) {
            return;
          }
          remountCount += 1;
          tvTrace("playback", "yt_onReady_watchdog_reconstruct", {
            remountCount,
          });
          teardownImperativeMount();
          allocatePlayerId(startupGenerationRef.current);
          destroyedRef.current = false;
          constructStartedAt =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          createPlayer();
        }, TV_EMBED_ONREADY_TIMEOUT_MS);
      };

      const createPlayer = () => {
        const w = getYtWindow();
        if (!alive || !w?.YT?.Player) return;
        if (destroyedRef.current) return;
        if (playerRef.current) return;
        if (!ensureImperativeMount()) return;

        const playerVars = getYoutubePlayerVarsChromeless({
          autoplay: autoplayRef.current,
          mute: true,
          start: enableLiveOffsetEmbedRef.current
            ? mountedStartSecondsRef.current
            : undefined,
        });

        try {
          playerRef.current = new w.YT.Player(playerIdRef.current, {
            videoId: youtubeVideoId,
            host: YOUTUBE_NO_COOKIE_HOST,
            width: "100%",
            height: "100%",
            playerVars,
            events: {
              onReady: (event: { target: YtPlayerLike }) => {
                if (!shouldAcceptTvPlayerYtCallback(destroyedRef.current)) {
                  return;
                }
                clearWatchdog();
                const target = event.target;
                playerRef.current = target;
                readyRef.current = true;
                applyIframePresentationToTarget(target);

                if (pendingLoadRef.current) {
                  const { videoId: vid, start } = pendingLoadRef.current;
                  pendingLoadRef.current = null;
                  suppressUserIntentUntilRef.current =
                    Date.now() + PROGRAMMATIC_SUPPRESS_MS;
                  tvTrace("playback", "player_load_pending", {
                    videoId: vid,
                    start,
                  });
                  target.loadVideoById?.(vid, start);
                  if (target.isMuted?.()) {
                    tracePlayVideoResult(
                      "TvPlayer.onReady.pending_muted_play",
                      target.playVideo?.()
                    );
                  }
                } else if (autoplayRef.current) {
                  tracePlayVideoResult(
                    externallyControlledRef.current
                      ? "TvPlayer.onReady.orchestrated_play"
                      : "TvPlayer.onReady.autoplay",
                    target.playVideo?.()
                  );
                }

                tvTrace("playback", "onReady", {
                  videoId: extractYoutubeID(videoUrlRef.current),
                  externallyControlled: externallyControlledRef.current,
                });
                tvLoadMark("T5", {
                  videoId: extractYoutubeID(videoUrlRef.current),
                });
                updateTvStartupContext({
                  playerReady: true,
                  playerState: "READY",
                });
                const gen = startupGenerationRef.current;
                ensureApiObjectDetectedAtReady({
                  startupGeneration: gen,
                  traceId: getTvStartupTraceId(),
                });
                tvStartupEvent("player_ready", {
                  canonicalMark: "T8",
                  trigger: "youtube_onReady",
                  data: {
                    externallyControlled: externallyControlledRef.current,
                  },
                });

                if (
                  enableLiveOffsetEmbedRef.current &&
                  onInitialEmbedConfirmedRef.current
                ) {
                  onInitialEmbedConfirmedRef.current({
                    startupGeneration: gen,
                  });
                }

                syncMuteFromPlayer(target);
                onReadyRef.current?.();
              },
              onStateChange: (event: {
                data: number;
                target: YtPlayerLike;
              }) => {
                if (!shouldAcceptTvPlayerYtCallback(destroyedRef.current)) {
                  return;
                }
                const target = event.target;
                const state = event.data;

                tvTrace("playback", "onStateChange", {
                  state,
                  stateName: ytStateName(state),
                  videoId: extractYoutubeID(videoUrlRef.current),
                });
                updateTvStartupContext({
                  playerState: ytStateName(state),
                });

                if (state === 3) {
                  tvStartupEvent("player_buffering", {
                    canonicalMark: "T10",
                    trigger: "youtube_state_3",
                  });
                }
                if (state === 1) {
                  syncMuteFromPlayer(target);
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
                  onPlayRef.current?.();
                }
                if (state === 2) {
                  syncMuteFromPlayer(target);
                  onPauseRef.current?.();
                  if (Date.now() >= suppressUserIntentUntilRef.current) {
                    onUserPauseRef.current?.();
                  }
                }
                if (state === 5) {
                  applyIframePresentationToTarget(target);
                  syncMuteFromPlayer(target);
                  tvTrace("playback", "onPlaybackReady", {
                    videoId: extractYoutubeID(videoUrlRef.current),
                  });
                  if (target.isMuted?.() && target.getPlayerState?.() !== 1) {
                    tracePlayVideoResult(
                      "TvPlayer.cued_muted_play",
                      target.playVideo?.()
                    );
                  }
                  onPlaybackReadyRef.current?.();
                }
                if (state === 0) onEndRef.current?.();
              },
              onError: (event: { data: number }) => {
                if (!shouldAcceptTvPlayerYtCallback(destroyedRef.current)) {
                  return;
                }
                onPlayerErrorRef.current?.(event.data);
              },
            },
          });
          scheduleOnReadyWatchdog();
        } catch (err) {
          tvTrace("playback", "yt_player_construct_failed", {
            error: String(err),
          });
        }
      };

      const init = () => {
        if (!alive) return;
        raf = requestAnimationFrame(createPlayer);
      };

      if (reuse) {
        if (!readyRef.current) {
          scheduleOnReadyWatchdog();
        }
      } else if (getYtWindow()?.YT?.Player) {
        init();
      } else {
        offReady = onYoutubeIframeApiReady(init);
      }

      return () => {
        alive = false;
        cancelAnimationFrame(raf);
        offReady?.();
        clearWatchdog();
      };
    }, [
      youtubeChildReleased,
      youtubeVideoId,
      startupGeneration,
      allocatePlayerId,
      ensureImperativeMount,
      teardownImperativeMount,
      applyIframePresentationToTarget,
      syncMuteFromPlayer,
      maybeNotifyVideoAspectOnce,
    ]);

    useEffect(() => {
      return () => {
        teardownImperativeMount();
      };
    }, [teardownImperativeMount]);

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

    useImperativeHandle(
      ref,
      () => ({
        isReady: getReady,
        isIframeLive: () => isYoutubePlayerIframeLive(playerRef.current),

        play: () => {
          safeYoutubeCall(() => {
            const result = playerRef.current?.playVideo?.();
            tracePlayVideoResult("TvPlayer.play", result);
          }, undefined);
        },
        pause: () =>
          safeYoutubeCall(() => playerRef.current?.pauseVideo?.(), undefined),
        pauseProgrammatic: () => {
          beginProgrammaticPlayback();
          safeYoutubeCall(() => playerRef.current?.pauseVideo?.(), undefined);
        },
        stop: () => {
          beginProgrammaticPlayback();
          safeYoutubeCall(() => playerRef.current?.stopVideo?.(), undefined);
        },

        mute: () => {
          safeYoutubeCall(() => playerRef.current?.mute?.(), undefined);
          tvTrace("autoplay", "mute", { source: "TvPlayer.mute" });
          onMuteChange?.(true);
        },
        unmute: () => {
          safeYoutubeCall(() => playerRef.current?.unMute?.(), undefined);
          tvTrace("autoplay", "unmute", { source: "TvPlayer.unmute" });
          onMuteChange?.(false);
        },
        isMuted: () =>
          safeYoutubeCall(() => !!playerRef.current?.isMuted?.(), true),
        syncMuteFromPlayer: () => syncMuteFromPlayer(),

        setVolume: (vol: number) =>
          safeYoutubeCall(() => playerRef.current?.setVolume?.(vol), undefined),
        getCurrentTime: () =>
          safeYoutubeCall(() => playerRef.current?.getCurrentTime?.() ?? 0, 0),
        getDuration: () =>
          safeYoutubeCall(() => playerRef.current?.getDuration?.() ?? 0, 0),
        getPlayerState: () => {
          return safeYoutubeCall(() => {
            const p = playerRef.current;
            if (!p || typeof p.getPlayerState !== "function") return null;
            return ytStateName(p.getPlayerState());
          }, null);
        },
        seekTo: (time: number, notifyUserSeek?: boolean) => {
          if (notifyUserSeek) {
            onUserSeek?.(time);
          } else {
            beginProgrammaticPlayback();
          }
          safeYoutubeCall(
            () => playerRef.current?.seekTo?.(time, true),
            undefined
          );
        },

        load: (videoId: string, start: number) => {
          tvTrace("playback", "player_load", { videoId, start });
          beginProgrammaticPlayback();
          if (getReady() && playerRef.current) {
            safeYoutubeCall(() => {
              playerRef.current!.loadVideoById?.(videoId, start);
              if (playerRef.current!.isMuted?.()) {
                tracePlayVideoResult(
                  "TvPlayer.load.muted_play",
                  playerRef.current!.playVideo?.()
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

    useLayoutEffect(() => {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      applyIframePresentationToTarget(p);
    }, [cover, containFill, youtubeVideoId, applyIframePresentationToTarget]);

    return (
      <div
        ref={shellRef}
        className={
          fillStage
            ? "pointer-events-none relative h-full min-h-0 w-full min-w-0 overflow-hidden"
            : "pointer-events-none relative h-full min-h-[200px] w-full min-w-0 overflow-hidden"
        }
      >
        <YoutubeChromeMask />
      </div>
    );
  }
);

TvPlayer.displayName = "TvPlayer";
export default TvPlayer;
