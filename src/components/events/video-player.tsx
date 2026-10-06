"use client";

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Local imports
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import {
  buildAspectInfo,
  fetchYoutubeAspectInfo,
  isOembedEmbedPlayerDimensions,
} from "@/lib/youtube-immersive-meta";
import type { YoutubeAspectInfo } from "@/lib/youtube-immersive-meta";
import {
  getYoutubePlayerVarsChromeless,
  getYoutubePlayerVarsMinimal,
  YOUTUBE_NO_COOKIE_HOST,
} from "@/lib/youtubePlayerConfig";
import type {
  YoutubeIframeObjectFitMode,
  YoutubePresentationVideoSize,
} from "@/lib/youtube-iframe-presentation";
import {
  clearYoutubeIframePresentation,
  styleYoutubeIframeAspectContain,
  styleYoutubeIframeAspectCover,
  styleYoutubeIframePresentation,
} from "@/lib/youtube-iframe-presentation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { YoutubeChromeMask } from "@/components/youtube-chrome-mask";
import { onYoutubeIframeApiReady } from "@/lib/youtube-iframe-api-loader";
import {
  loadReelSoundPref,
  persistReelSoundPref,
  readSessionMuted,
} from "@/lib/session-audio";
import {
  isInsidePlayerAudioIntentGrace,
  markPlayerAudioIntentGrace,
  shouldSuppressPlayerMuteSync,
} from "@/lib/player-audio-intent";
import {
  hasYoutubePlaybackApi,
  safeYoutubeCall,
} from "@/lib/tv/youtube-player-safe";

function safeYtPlay(p: YT.Player | null | undefined): void {
  if (!hasYoutubePlaybackApi(p)) return;
  safeYoutubeCall(() => p.playVideo(), undefined);
}

function safeYtPause(p: YT.Player | null | undefined): void {
  if (!hasYoutubePlaybackApi(p)) return;
  safeYoutubeCall(() => p.pauseVideo(), undefined);
}

function safeYtMute(p: YT.Player | null | undefined): void {
  if (!p || typeof p.mute !== "function") return;
  safeYoutubeCall(() => p.mute(), undefined);
}

function safeYtUnmute(p: YT.Player | null | undefined, volume = 100): void {
  if (!p || typeof p.unMute !== "function") return;
  safeYoutubeCall(() => {
    p.unMute();
    p.setVolume?.(volume);
  }, undefined);
}

export { loadReelSoundPref } from "@/lib/session-audio";

declare global {
  interface Window {
    YT: YT.Player | null;
    onYouTubeIframeAPIReady: () => void;
  }
}

type Props = {
  videoUrl: string;
  className?: string;
  isChannel?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onMuteStateChange?: (isMuted: boolean) => void;
  /** YouTube state ENDED (natural end of video). */
  onPlaybackEnded?: () => void;
  /** chromeless: no YT controls (default). minimal: native controls with reduced chrome. */
  embedMode?: "chromeless" | "minimal";
  /**
   * Fires when the iframe player is ready or a new video is cued (loadVideoById).
   * Dimensions come from YouTube oEmbed (cached); does not block playback.
   */
  onVideoAspectInfo?: (info: YoutubeAspectInfo) => void;
  /**
   * Mobile full-view: fill parent flex region and apply object-fit on the iframe.
   * Omit for inline / desktop sizing.
   */
  fullPresentationFit?: YoutubeIframeObjectFitMode | null;
  /**
   * When set with `fullPresentationFit="contain"`, uses min-scale (letterbox).
   * When set with `fullPresentationFit="cover"`, uses max-scale (crop), e.g. portrait web reels.
   */
  presentationVideoSize?: YoutubePresentationVideoSize | null;
  /**
   * When false, cues/pauses and stays muted (e.g. off-screen explore preload). Default true.
   */
  playbackActive?: boolean;
  /** After YouTube iframe `onReady` (video shell loaded / first cue). */
  onVideoLoaded?: () => void;
  /** Hide loading overlay (preloaded off-screen reels). */
  suppressLoadingChrome?: boolean;
  /** Replaces default gray loading scrim (e.g. `bg-black` for reels). */
  loadingBackdropClassName?: string;
  /** When false, no “Loading video…” pulse (less flicker on active reel). */
  showLoadingLabel?: boolean;
  /** When false, no opacity transition on loading layer (avoids flash). */
  transitionLoadingOverlay?: boolean;
  /** When true, skip window-level click/touch audio unlock. Default true so chrome clicks do not unmute. */
  disableGlobalAudioUnlock?: boolean;
  /** Applied on player ready; avoids delayed setMuted races on slide changes. */
  initialMuted?: boolean;
  /**
   * When true (default), mute/unmute read and write Explore session sound
   * (`session-audio`). Set false for isolated surfaces (e.g. Explore TV cards).
   */
  persistSessionAudio?: boolean;
  /**
   * When true (default), programmatic activation (play, cue, active slide) may
   * restore session sound preference. Set false for Explore reels (iOS-safe).
   */
  restoreSessionSoundOnProgrammaticPlay?: boolean;
  /** YouTube iframe player error (YT onError `data` code). */
  onError?: (errorCode?: number) => void;
  /** Observed YT player phase (Explore never-PLAYING recovery, etc.). */
  onYoutubePlayerPhase?: (
    phase: "playing" | "paused" | "buffering" | "ended" | "idle"
  ) => void;
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
  /** Unmute and start playback in one user-gesture stack. */
  unmuteAndPlay: () => void;
  isMuted: () => boolean;
  setMuted: (muted: boolean) => void;
  setvolume: (v: number) => void;
};

const VideoPlayer = forwardRef<VideoPlayerRef, Props>(
  (
    {
      videoUrl,
      className,
      isChannel,
      onPlayStateChange,
      onMuteStateChange,
      onPlaybackEnded,
      embedMode = "chromeless",
      onVideoAspectInfo,
      fullPresentationFit = null,
      presentationVideoSize = null,
      playbackActive = true,
      onVideoLoaded,
      suppressLoadingChrome = false,
      loadingBackdropClassName = "bg-gray-200",
      showLoadingLabel = true,
      transitionLoadingOverlay = true,
      disableGlobalAudioUnlock = true,
      initialMuted = true,
      persistSessionAudio = true,
      restoreSessionSoundOnProgrammaticPlay = true,
      onError,
      onYoutubePlayerPhase,
    },
    ref
  ) => {
    const playerRef = useRef<YT.Player | null>(null);
    const shellRef = useRef<HTMLDivElement>(null);
    /** Imperative mount node — YT mutates/replaces the target; must not be React-managed. */
    const containerMountRef = useRef<HTMLDivElement | null>(null);
    const playerIdRef = useRef(
      `yt-player-${Math.random().toString(36).slice(2)}`
    );
    const hasUserInteracted = useRef(false);
    const intentGraceUntilRef = useRef(0);
    const pendingMuteRef = useRef<boolean | null>(null);
    const playbackActiveRef = useRef(playbackActive);
    playbackActiveRef.current = playbackActive;
    /** True when we should play as soon as the YT iframe becomes ready (active before `playerRef` exists). */
    const pendingPlayAfterReadyRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(initialMuted);
    const initialMutedRef = useRef(initialMuted);
    initialMutedRef.current = initialMuted;
    const persistSessionAudioRef = useRef(persistSessionAudio);
    persistSessionAudioRef.current = persistSessionAudio;
    const restoreSessionSoundOnProgrammaticPlayRef = useRef(
      restoreSessionSoundOnProgrammaticPlay
    );
    restoreSessionSoundOnProgrammaticPlayRef.current =
      restoreSessionSoundOnProgrammaticPlay;
    const [playerError, setPlayerError] = useState<number | null>(null);

    const videoId = extractYoutubeID(videoUrl);

    const videoUrlRef = useRef(videoUrl);
    videoUrlRef.current = videoUrl;
    const onVideoAspectInfoRef = useRef(onVideoAspectInfo);
    onVideoAspectInfoRef.current = onVideoAspectInfo;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    const fullPresentationFitRef = useRef(fullPresentationFit);
    fullPresentationFitRef.current = fullPresentationFit;
    const presentationVideoSizeRef = useRef(presentationVideoSize);
    presentationVideoSizeRef.current = presentationVideoSize;

    const applyIframePresentation = (target: YT.Player) => {
      const fit = fullPresentationFitRef.current;
      const iframe = target.getIframe?.();
      if (!fit) {
        clearYoutubeIframePresentation(iframe);
        return;
      }
      const size = presentationVideoSizeRef.current;
      const shell = shellRef.current;
      if (
        size &&
        size.width > 0 &&
        size.height > 0 &&
        shell &&
        (fit === "contain" || fit === "cover")
      ) {
        const cr = shell.getBoundingClientRect();
        if (fit === "contain") {
          styleYoutubeIframeAspectContain(
            iframe,
            cr.width,
            cr.height,
            size.width,
            size.height
          );
        } else {
          styleYoutubeIframeAspectCover(
            iframe,
            cr.width,
            cr.height,
            size.width,
            size.height
          );
        }
      } else {
        styleYoutubeIframePresentation(iframe, fit);
      }
    };

    const onMuteStateChangeRef = useRef(onMuteStateChange);
    onMuteStateChangeRef.current = onMuteStateChange;
    const onPlayStateChangeRef = useRef(onPlayStateChange);
    onPlayStateChangeRef.current = onPlayStateChange;
    const onPlaybackEndedRef = useRef(onPlaybackEnded);
    onPlaybackEndedRef.current = onPlaybackEnded;
    const onYoutubePlayerPhaseRef = useRef(onYoutubePlayerPhase);
    onYoutubePlayerPhaseRef.current = onYoutubePlayerPhase;

    const emitYoutubePlayerPhase = (event: YT.OnStateChangeEvent): void => {
      const phaseRef = onYoutubePlayerPhaseRef;
      if (!phaseRef.current) return;
      const YTState = window.YT?.PlayerState;
      if (!YTState) return;
      const data = event.data;
      if (data === YTState.PLAYING) phaseRef.current("playing");
      else if (data === YTState.BUFFERING) phaseRef.current("buffering");
      else if (data === YTState.PAUSED) phaseRef.current("paused");
      else if (data === YTState.ENDED) phaseRef.current("ended");
      else phaseRef.current("idle");
    };

    const syncMuteFromPlayer = (target?: YT.Player | null) => {
      if (isInsidePlayerAudioIntentGrace(intentGraceUntilRef)) return;
      const p = target ?? playerRef.current;
      if (!p || typeof p.isMuted !== "function") return;
      const muted = p.isMuted();
      if (
        persistSessionAudioRef.current &&
        shouldSuppressPlayerMuteSync(muted, readSessionMuted())
      ) {
        return;
      }
      setIsMuted(muted);
      onMuteStateChangeRef.current?.(muted);
    };

    const restoreReelSoundIfPreferred = (target?: YT.Player | null) => {
      if (!restoreSessionSoundOnProgrammaticPlayRef.current) return;
      if (!persistSessionAudioRef.current) return;
      const p = target ?? playerRef.current;
      if (!p || !playbackActiveRef.current) return;
      if (!loadReelSoundPref()) return;
      if (typeof p.isMuted === "function" && !p.isMuted()) {
        syncMuteFromPlayer(p);
        return;
      }
      safeYtUnmute(p);
      syncMuteFromPlayer(p);
    };

    const invokeYtTarget = (
      target: YT.Player,
      fn: (t: YT.Player) => void
    ): void => {
      if (!hasYoutubePlaybackApi(target)) return;
      safeYoutubeCall(() => fn(target), undefined);
    };

    /** Updates canonical Explore reel aspect via onVideoAspectInfo → onPlayerAspectInfo. */
    const notifyVideoAspect = () => {
      const url = videoUrlRef.current;
      const size = presentationVideoSizeRef.current;
      const id = extractYoutubeID(url ?? "");
      const reapplyPresentation = () => {
        const p = playerRef.current;
        if (p) applyIframePresentation(p);
      };
      if (
        id &&
        size &&
        size.width > 0 &&
        size.height > 0 &&
        !isOembedEmbedPlayerDimensions(size.width, size.height)
      ) {
        onVideoAspectInfoRef.current?.(
          buildAspectInfo(id, size.width, size.height, "oembed")
        );
        reapplyPresentation();
        return;
      }
      void fetchYoutubeAspectInfo(url).then(info => {
        if (info) {
          onVideoAspectInfoRef.current?.(info);
          reapplyPresentation();
        }
      });
    };

    const unlockAudio = () => {
      if (!playbackActiveRef.current) return;
      if (!playerRef.current || hasUserInteracted.current) return;

      hasUserInteracted.current = true;
      safeYtUnmute(playerRef.current);
      setIsMuted(false);
      if (persistSessionAudioRef.current) {
        persistReelSoundPref(true);
      }
    };

    useEffect(() => {
      if (disableGlobalAudioUnlock) return undefined;

      const handler = () => unlockAudio();

      window.addEventListener("click", handler, { once: true });
      window.addEventListener("keydown", handler, { once: true });
      window.addEventListener("touchstart", handler, { once: true });

      return () => {
        window.removeEventListener("click", handler);
        window.removeEventListener("keydown", handler);
        window.removeEventListener("touchstart", handler);
      };
    }, [disableGlobalAudioUnlock]);

    const ensureContainerMount = () => {
      if (!shellRef.current) return null;
      if (containerMountRef.current) return containerMountRef.current;
      const mount = document.createElement("div");
      mount.id = playerIdRef.current;
      mount.className = `h-full w-full object-cover ${className ?? ""}`;
      Object.assign(mount.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      });
      shellRef.current.appendChild(mount);
      containerMountRef.current = mount;
      return mount;
    };

    const createPlayer = () => {
      if (!videoId || playerRef.current) return;
      if (!ensureContainerMount()) return;

      const autoplay = playbackActiveRef.current;
      const baseVars =
        embedMode === "minimal"
          ? getYoutubePlayerVarsMinimal({ autoplay, mute: true })
          : getYoutubePlayerVarsChromeless({ autoplay, mute: true });

      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        host: YOUTUBE_NO_COOKIE_HOST,
        playerVars: baseVars as YT.PlayerOptions["playerVars"],
        events: {
          onReady: (event: YT.PlayerEvent) => {
            setLoading(false);

            notifyVideoAspect();
            applyIframePresentation(event.target);
            onVideoLoaded?.();

            const wantPlay =
              playbackActiveRef.current || pendingPlayAfterReadyRef.current;
            if (pendingPlayAfterReadyRef.current) {
              pendingPlayAfterReadyRef.current = false;
            }

            const preferSound =
              restoreSessionSoundOnProgrammaticPlayRef.current &&
              persistSessionAudioRef.current &&
              playbackActiveRef.current &&
              loadReelSoundPref();
            const startMuted = preferSound
              ? false
              : initialMutedRef.current !== false;

            if (wantPlay) {
              invokeYtTarget(event.target, t => t.playVideo());
              if (!startMuted) {
                safeYtUnmute(event.target);
              } else {
                safeYtMute(event.target);
              }
            } else {
              safeYtPause(event.target);
              safeYtMute(event.target);
            }
            syncMuteFromPlayer(event.target);
            const pendingMute = pendingMuteRef.current;
            if (pendingMute != null) {
              pendingMuteRef.current = null;
              markPlayerAudioIntentGrace(intentGraceUntilRef);
              if (pendingMute) {
                safeYtMute(event.target);
              } else {
                safeYtUnmute(event.target);
              }
              setIsMuted(pendingMute);
            }
          },
          onError: (ev: { data?: number }) => {
            const code = ev?.data;
            console.error(
              "[VideoPlayer] YouTube player error",
              code,
              videoUrlRef.current
            );
            setPlayerError(typeof code === "number" ? code : -1);
            setLoading(false);
            onErrorRef.current?.(code);
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            emitYoutubePlayerPhase(event);
            if (event.data === window.YT.PlayerState.CUED) {
              applyIframePresentation(event.target);
              notifyVideoAspect();
              syncMuteFromPlayer(event.target);
            }
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (!playbackActiveRef.current) {
                safeYtPause(event.target);
                return;
              }
              setLoading(false);
              restoreReelSoundIfPreferred(event.target);
              onPlayStateChangeRef.current?.(true);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              onPlayStateChangeRef.current?.(false);
              onPlaybackEndedRef.current?.();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              syncMuteFromPlayer(event.target);
              onPlayStateChangeRef.current?.(false);
            }
          },
        },
      });
    };

    useImperativeHandle(ref, () => ({
      isReady: () =>
        !!playerRef.current &&
        typeof playerRef.current.getDuration === "function",

      play: () => {
        safeYtPlay(playerRef.current);
      },
      pause: () => safeYtPause(playerRef.current),
      stop: () => {
        const p = playerRef.current;
        if (!p || typeof p.stopVideo !== "function") return;
        safeYoutubeCall(() => p.stopVideo(), undefined);
      },
      mute: () => {
        if (persistSessionAudioRef.current) {
          persistReelSoundPref(false);
        }
        markPlayerAudioIntentGrace(intentGraceUntilRef);
        setIsMuted(true);
        onMuteStateChangeRef.current?.(true);
        safeYtMute(playerRef.current);
      },
      unmute: () => {
        if (persistSessionAudioRef.current) {
          persistReelSoundPref(true);
        }
        safeYtUnmute(playerRef.current);
        markPlayerAudioIntentGrace(intentGraceUntilRef);
        setIsMuted(false);
        onMuteStateChangeRef.current?.(false);
      },
      unmuteAndPlay: () => {
        const p = playerRef.current;
        if (!p) return;
        if (persistSessionAudioRef.current) {
          persistReelSoundPref(true);
        }
        safeYtUnmute(p);
        markPlayerAudioIntentGrace(intentGraceUntilRef);
        setIsMuted(false);
        onMuteStateChangeRef.current?.(false);
        safeYtPlay(p);
      },
      isMuted: () => playerRef.current?.isMuted?.() ?? isMuted,

      setMuted: (muted: boolean) => {
        const p = playerRef.current;
        if (!p) return;
        if (muted) {
          safeYtMute(p);
          if (persistSessionAudioRef.current) {
            persistReelSoundPref(false);
          }
        } else {
          safeYtUnmute(p);
          if (persistSessionAudioRef.current) {
            persistReelSoundPref(true);
          }
        }
        syncMuteFromPlayer();
      },

      setvolume: (v: number) => {
        const p = playerRef.current;
        if (!p || typeof p.setVolume !== "function") return;
        safeYoutubeCall(() => p.setVolume(v), undefined);
        if (v === 0) {
          safeYtMute(p);
          if (persistSessionAudioRef.current) {
            persistReelSoundPref(false);
          }
        } else {
          safeYtUnmute(p, v);
          if (persistSessionAudioRef.current) {
            persistReelSoundPref(true);
          }
        }
        syncMuteFromPlayer();
      },
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      getDuration: () => playerRef.current?.getDuration() ?? 0,
      seekTo: (t: number) => playerRef.current?.seekTo(t, true),
      getTitle: () => playerRef.current?.getVideoData()?.title ?? "",
    }));

    useEffect(() => {
      playbackActiveRef.current = playbackActive;
      const p = playerRef.current;
      if (!playbackActive) {
        pendingPlayAfterReadyRef.current = false;
        if (!p) return;
        safeYtPause(p);
        safeYtMute(p);
        return;
      }
      if (!p) {
        pendingPlayAfterReadyRef.current = true;
        return;
      }
      pendingPlayAfterReadyRef.current = false;
      safeYtPlay(p);
      restoreReelSoundIfPreferred(p);

      let attempts = 0;
      const retrySound = () => {
        if (!playbackActiveRef.current || attempts >= 8) return;
        attempts += 1;
        const player = playerRef.current;
        if (!player || typeof player.isMuted !== "function") {
          window.setTimeout(retrySound, 120);
          return;
        }
        if (!restoreSessionSoundOnProgrammaticPlayRef.current) return;
        if (!persistSessionAudioRef.current) return;
        if (!loadReelSoundPref()) return;
        if (!player.isMuted()) return;
        safeYtUnmute(player);
        syncMuteFromPlayer(player);
      };
      if (
        restoreSessionSoundOnProgrammaticPlayRef.current &&
        persistSessionAudioRef.current &&
        loadReelSoundPref()
      ) {
        window.setTimeout(retrySound, 120);
      }
    }, [playbackActive]);

    useEffect(() => {
      if (!videoId) return;
      setPlayerError(null);

      // If player exists, load the new video
      if (
        playerRef.current &&
        typeof playerRef.current.loadVideoById === "function"
      ) {
        setLoading(true);
        safeYoutubeCall(
          () => playerRef.current!.loadVideoById(videoId),
          undefined
        );
        if (playbackActiveRef.current) {
          const p = playerRef.current;
          safeYtPlay(p);
          restoreReelSoundIfPreferred(p);
        }
        return;
      }

      let alive = true;
      let raf = 0;
      const runCreate = () => {
        if (!alive || !shellRef.current) return;
        createPlayer();
      };
      const init = () => {
        if (!alive) return;
        raf = requestAnimationFrame(runCreate);
      };

      if (window.YT?.Player) {
        init();
      } else {
        const offReady = onYoutubeIframeApiReady(init);
        return () => {
          alive = false;
          cancelAnimationFrame(raf);
          offReady();
        };
      }

      return () => {
        alive = false;
        cancelAnimationFrame(raf);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, embedMode]);

    useEffect(() => {
      return () => {
        try {
          playerRef.current?.destroy();
        } catch {
          /* YT may already be tearing down */
        }
        playerRef.current = null;
        const mount = containerMountRef.current;
        if (mount?.parentNode) {
          mount.parentNode.removeChild(mount);
        }
        containerMountRef.current = null;
      };
    }, []);

    useLayoutEffect(() => {
      if (!fullPresentationFit) {
        const iframe = playerRef.current?.getIframe?.();
        clearYoutubeIframePresentation(iframe);
        return;
      }

      const shell = shellRef.current;
      if (!shell) return;

      const sync = () => {
        const iframe = playerRef.current?.getIframe?.();
        if (!iframe) return;
        const fit = fullPresentationFitRef.current;
        if (!fit) {
          clearYoutubeIframePresentation(iframe);
          return;
        }
        const size = presentationVideoSizeRef.current;
        if (
          size &&
          size.width > 0 &&
          size.height > 0 &&
          (fit === "contain" || fit === "cover")
        ) {
          const cr = shell.getBoundingClientRect();
          if (fit === "contain") {
            styleYoutubeIframeAspectContain(
              iframe,
              cr.width,
              cr.height,
              size.width,
              size.height
            );
          } else {
            styleYoutubeIframeAspectCover(
              iframe,
              cr.width,
              cr.height,
              size.width,
              size.height
            );
          }
        } else {
          styleYoutubeIframePresentation(iframe, fit);
        }
      };

      sync();
      const ro = new ResizeObserver(sync);
      ro.observe(shell);
      return () => ro.disconnect();
    }, [
      fullPresentationFit,
      videoId,
      presentationVideoSize?.width,
      presentationVideoSize?.height,
    ]);

    if (!videoId) return <p>Invalid video link</p>;

    const retryPlayback = () => {
      setPlayerError(null);
      setLoading(true);
      const p = playerRef.current;
      if (p && videoId && typeof p.loadVideoById === "function") {
        safeYoutubeCall(() => p.loadVideoById(videoId), undefined);
        if (playbackActiveRef.current) {
          safeYtPlay(p);
          restoreReelSoundIfPreferred(p);
        }
      }
    };

    const shellClass =
      fullPresentationFit != null
        ? "relative h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden"
        : `relative ${isChannel ? "h-[50vh]" : "h-[25vh]"} w-full sm:h-full`;

    const showLoadingLayer =
      !suppressLoadingChrome && loading && playerError == null;
    const overlayTransition = transitionLoadingOverlay
      ? "transition-opacity duration-150 ease-out"
      : "";

    return (
      <div
        ref={shellRef}
        className={shellClass}
      >
        {!suppressLoadingChrome ? (
          <div
            className={cn(
              "absolute inset-0 z-10 flex items-center justify-center",
              loadingBackdropClassName,
              overlayTransition,
              showLoadingLayer
                ? "pointer-events-none opacity-100"
                : "pointer-events-none opacity-0"
            )}
          >
            {showLoadingLabel ? (
              <span className="animate-pulse text-gray-500">
                Loading video…
              </span>
            ) : null}
          </div>
        ) : null}
        {playerError != null ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
            <p className="text-sm text-white/90">
              This video couldn&apos;t be played
              {playerError > 0 ? ` (${playerError})` : ""}.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={retryPlayback}
            >
              Try again
            </Button>
          </div>
        ) : null}
        {embedMode === "chromeless" ? <YoutubeChromeMask /> : null}
        {fullPresentationFit != null ? (
          <div
            className="pointer-events-auto absolute right-0 bottom-0 z-[60] h-14 w-14 bg-transparent"
            aria-hidden
            onPointerDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        ) : null}
      </div>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
