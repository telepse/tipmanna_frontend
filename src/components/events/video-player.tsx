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

const REEL_SOUND_SESSION_KEY = "tipmanna_yt_explore_sound_on";

function persistReelSoundPref(on: boolean) {
  try {
    if (typeof window === "undefined") return;
    window.sessionStorage?.setItem(REEL_SOUND_SESSION_KEY, on ? "1" : "0");
  } catch {
    /* noop */
  }
}

export function loadReelSoundPref(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.sessionStorage?.getItem(REEL_SOUND_SESSION_KEY) === "1"
    );
  } catch {
    return false;
  }
}

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
  /** When true, skip window-level click/touch audio unlock (Explore reels manage sound). */
  disableGlobalAudioUnlock?: boolean;
  /** YouTube iframe player error (YT onError `data` code). */
  onError?: (errorCode?: number) => void;
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
      disableGlobalAudioUnlock = false,
      onError,
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
    const playbackActiveRef = useRef(playbackActive);
    playbackActiveRef.current = playbackActive;
    /** True when we should play as soon as the YT iframe becomes ready (active before `playerRef` exists). */
    const pendingPlayAfterReadyRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
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

    const syncMuteFromPlayer = (target?: YT.Player | null) => {
      const p = target ?? playerRef.current;
      if (!p || typeof p.isMuted !== "function") return;
      const muted = p.isMuted();
      setIsMuted(muted);
      onMuteStateChangeRef.current?.(muted);
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
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      setIsMuted(false);
      persistReelSoundPref(true);
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
              playbackActiveRef.current && loadReelSoundPref();

            if (wantPlay) {
              event.target.playVideo();
              if (preferSound) {
                event.target.unMute();
                event.target.setVolume(100);
              }
            } else {
              event.target.pauseVideo();
              event.target.mute();
            }
            syncMuteFromPlayer(event.target);
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
            if (event.data === window.YT.PlayerState.CUED) {
              applyIframePresentation(event.target);
              notifyVideoAspect();
              syncMuteFromPlayer(event.target);
            }
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (!playbackActiveRef.current) {
                event.target.pauseVideo();
                return;
              }
              setLoading(false);
              syncMuteFromPlayer(event.target);
              onPlayStateChange?.(true);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              onPlayStateChange?.(false);
              onPlaybackEnded?.();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              syncMuteFromPlayer(event.target);
              onPlayStateChange?.(false);
            }
          },
        },
      });
    };

    // Whenever mute/unmute happens inside VideoPlayer
    const setPlayerMuteState = (muted: boolean) => {
      setIsMuted(muted);
      onMuteStateChange?.(muted);
    };

    useImperativeHandle(ref, () => ({
      isReady: () =>
        !!playerRef.current &&
        typeof playerRef.current.getDuration === "function",

      play: () => {
        if (!playerRef.current) return;

        const muted = playerRef.current.isMuted?.() ?? isMuted;
        if (muted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }

        playerRef.current.playVideo();
      },
      pause: () => playerRef.current?.pauseVideo(),
      stop: () => playerRef.current?.stopVideo(),
      mute: () => {
        playerRef.current?.mute();
        setPlayerMuteState(true);
        persistReelSoundPref(false);
      },
      // unmute: () => {
      //   playerRef.current?.unMute();
      //   setPlayerMuteState(false);
      //   persistReelSoundPref(true);
      // },
      unmute: () => {
        const p = playerRef.current;
        if (!p) return;

        const wasPlaying =
          p.getPlayerState?.() === window.YT.PlayerState.PLAYING;
        const state = p.getPlayerState?.();

        p.unMute();
        setPlayerMuteState(false);
        persistReelSoundPref(true);

        if (
          !wasPlaying &&
          (state === window.YT.PlayerState.PAUSED ||
            state === window.YT.PlayerState.CUED)
        ) {
          p.playVideo();
        }
      },
      isMuted: () => playerRef.current?.isMuted?.() ?? isMuted,

      setMuted: (muted: boolean) => {
        const p = playerRef.current;
        if (!p) return;
        if (muted) {
          p.mute();
          setPlayerMuteState(true);
          persistReelSoundPref(false);
        } else {
          p.unMute();
          p.setVolume(100);
          setPlayerMuteState(false);
          persistReelSoundPref(true);
        }
      },

      setvolume: (v: number) => {
        playerRef.current?.setVolume(v);
        if (v === 0) {
          setPlayerMuteState(true);
          persistReelSoundPref(false);
        } else {
          setPlayerMuteState(false);
          persistReelSoundPref(true);
        }
      },
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      getDuration: () => playerRef.current?.getDuration() ?? 0,
      seekTo: (t: number) => playerRef.current?.seekTo(t, true),
      getTitle: () => playerRef.current?.getVideoData()?.title ?? "",
    }));

    useEffect(() => {
      playbackActiveRef.current = playbackActive;
      if (playbackActive && !playerRef.current) {
        pendingPlayAfterReadyRef.current = true;
      }
      if (!playbackActive) {
        pendingPlayAfterReadyRef.current = false;
      }
      const raf = requestAnimationFrame(() => {
        const p = playerRef.current;
        if (!p) return;
        pendingPlayAfterReadyRef.current = false;
        if (!playbackActiveRef.current) {
          p.pauseVideo();
          p.mute();
        } else {
          p.playVideo();
        }
      });
      return () => cancelAnimationFrame(raf);
    }, [playbackActive]);

    useEffect(() => {
      if (!videoId) return;
      setPlayerError(null);

      // If player exists, load the new video
      if (playerRef.current && playerRef.current.loadVideoById) {
        setLoading(true);
        playerRef.current.loadVideoById(videoId);
        const rafPlay = requestAnimationFrame(() => {
          const p = playerRef.current;
          if (!p || !playbackActiveRef.current) return;
          p.playVideo();
          if (loadReelSoundPref()) {
            p.unMute();
            p.setVolume(100);
          }
          syncMuteFromPlayer(p);
        });
        return () => cancelAnimationFrame(rafPlay);
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
      if (p && videoId) {
        p.loadVideoById(videoId);
        if (playbackActiveRef.current) {
          p.playVideo();
          if (loadReelSoundPref()) {
            p.unMute();
            p.setVolume(100);
            setPlayerMuteState(false);
          }
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
