"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TvPlayer from "@/components/tv/tv-player";
import { EnforcementPreNoticeOverlay } from "@/components/tv/enforcement-pre-notice-overlay";
import { useTV } from "@/components/tv-provider";
import { useTvPlayerControls } from "@/hooks/use-tv-player-controls";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { isTvInitialLiveOffsetEmbedEnabled } from "@/lib/tv-feature-flags";
import { computeInitialEmbedPosition } from "@/lib/tv-initial-live-offset-embed";
import { resolveBroadcastPosition } from "@/lib/tv/broadcastEngine";

import { WatchTransportBar } from "./watch-transport-bar";

export function WatchTvTheater() {
  const {
    items,
    currentIndex,
    mode,
    playerRef,
    goLive,
    enterLocalMode,
    onPlayerPause,
    onPlayerSeek,
    onVideoEnd,
    setPlayerPlayingState,
    setPlayerVisible,
    unregisterTvPlayer,
    applyPendingPlaybackRestore,
    applyPendingAudioRestore,
    notifyStartupPlayerPlaying,
    handleStartupPlayerError,
    playingItemOverride,
    scheduleSourceCommunityId,
    initialPlaybackTarget,
    startupEmbedGeneration,
    broadcastEpoch,
    totalDuration,
    getSyncedNow,
    onInitialLiveOffsetEmbedCommitted,
    onInitialLiveOffsetEmbedConfirmed,
    livePreNotice,
    localPreNoticeSnapshot,
    isPreNoticeDismissed,
    restorePreNoticeLocal,
    scheduleError,
    retryScheduleLoad,
    isReady,
  } = useTV();

  const current = playingItemOverride ?? items[currentIndex] ?? items[0];
  const isNotice = current?.segmentKind === "notice";
  const isPreNotice = isNotice && current?.noticePhase !== "post";
  const showPreNoticeOverlay =
    (mode === "GLOBAL" && isPreNotice) ||
    (mode === "LOCAL" &&
      livePreNotice != null &&
      !isPreNoticeDismissed(livePreNotice.enforcementId));

  const lastPlayableUrlRef = useRef("");
  useEffect(() => {
    const u = current?.channel?.url;
    if (!isNotice && u && extractYoutubeID(u)) {
      lastPlayableUrlRef.current = u;
    }
  }, [current?.id, current?.channel?.url, isNotice]);

  const bootstrapPlayableUrl = useMemo(() => {
    const row = items.find(it => {
      const u = (it as { channel?: { url?: string } }).channel?.url;
      return u && extractYoutubeID(u);
    }) as { channel?: { url?: string } } | undefined;
    return row?.channel?.url ?? "";
  }, [items]);

  const effectivePlayerUrl = isNotice
    ? lastPlayableUrlRef.current || bootstrapPlayableUrl
    : (current?.channel?.url ?? "");

  const playbackUrl =
    effectivePlayerUrl && extractYoutubeID(effectivePlayerUrl)
      ? effectivePlayerUrl
      : "";

  const liveOffsetEmbed = useMemo(() => {
    if (
      !isTvInitialLiveOffsetEmbedEnabled() ||
      !initialPlaybackTarget ||
      mode !== "GLOBAL" ||
      isNotice ||
      !broadcastEpoch ||
      !totalDuration ||
      !items.length
    ) {
      return null;
    }
    return computeInitialEmbedPosition({
      t6Index: initialPlaybackTarget.selectedIndex,
      t6OffsetSeconds: initialPlaybackTarget.startOffsetSeconds,
      t6ResolvedAtPerformanceMs: initialPlaybackTarget.resolvedAtPerformanceMs,
      items,
      broadcastEpoch,
      totalDuration,
      nowMs: getSyncedNow(),
      performanceNowMs:
        typeof performance !== "undefined" ? performance.now() : Date.now(),
      extractVideoId: extractYoutubeID,
      resolvePosition: (scheduleItems, epoch, total, now) => {
        const pos = resolveBroadcastPosition(
          scheduleItems as Parameters<typeof resolveBroadcastPosition>[0],
          epoch,
          total,
          now
        );
        return {
          scheduleIndex: pos.scheduleIndex,
          offsetSeconds: pos.offsetSeconds,
        };
      },
    });
  }, [
    initialPlaybackTarget,
    mode,
    isNotice,
    broadcastEpoch,
    totalDuration,
    items,
    getSyncedNow,
  ]);

  const effectiveEmbedPlaybackUrl = useMemo(() => {
    if (!liveOffsetEmbed || mode !== "GLOBAL" || isNotice) return playbackUrl;
    const item = items[liveOffsetEmbed.selectedIndex] as
      | { channel?: { url?: string } }
      | undefined;
    const url = item?.channel?.url;
    if (url && extractYoutubeID(url) === liveOffsetEmbed.videoId) return url;
    return playbackUrl;
  }, [liveOffsetEmbed, mode, isNotice, items, playbackUrl]);

  const enableLiveOffsetEmbedFinal = Boolean(
    liveOffsetEmbed &&
      liveOffsetEmbed.videoId === extractYoutubeID(effectiveEmbedPlaybackUrl)
  );

  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const pendingSeekTimeRef = useRef<number | null>(null);

  const scheduleItemDuration = useMemo(() => {
    const d = (current as { duration?: number } | undefined)?.duration;
    return typeof d === "number" && d > 0 ? d : 0;
  }, [current]);

  const {
    isPlaying,
    togglePlayPause,
    toggleMute,
    isMuted,
    onPlayerReady,
    notifyPlayerPlaying,
    notifyPlayerPaused,
    syncFromPlayer,
  } = useTvPlayerControls({
    playerRef,
    mode,
    enterLocalMode,
    setPlayerPlayingState,
    scheduleSourceCommunityId,
  });

  useEffect(() => {
    setIsPlayerLoading(true);
  }, [startupEmbedGeneration]);

  useEffect(() => {
    if (!isPlayerLoading) return;
    const timeout = window.setTimeout(() => setIsPlayerLoading(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [isPlayerLoading, startupEmbedGeneration]);

  useEffect(() => {
    setPlayerVisible(true);
    return () => {
      const player = playerRef.current;
      if (player?.isReady?.()) {
        try {
          player.pauseProgrammatic?.();
          player.mute();
        } catch {
          /* tearing down */
        }
      }
      setPlayerVisible(false);
      unregisterTvPlayer();
    };
  }, [setPlayerVisible, unregisterTvPlayer, playerRef]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(scheduleItemDuration);
    setIsSeeking(false);
  }, [current?.id, scheduleItemDuration]);

  useEffect(() => {
    const interval = setInterval(() => {
      const player = playerRef.current;
      if (!player?.isReady()) return;
      const dur = player.getDuration();
      if (dur > 0) setDuration(dur);
      if (!isSeeking) setCurrentTime(player.getCurrentTime());
    }, 250);
    return () => clearInterval(interval);
  }, [playerRef, isSeeking]);

  const flushPendingSeek = useCallback(() => {
    const pending = pendingSeekTimeRef.current;
    if (pending == null) return;
    const player = playerRef.current;
    if (!player?.isReady()) return;
    pendingSeekTimeRef.current = null;
    player.seekTo(pending, true);
    setCurrentTime(pending);
  }, [playerRef]);

  const seekTo = (time: number) => {
    setCurrentTime(time);
    const player = playerRef.current;
    if (!player?.isReady()) {
      pendingSeekTimeRef.current = time;
      onPlayerSeek(time);
      return;
    }
    pendingSeekTimeRef.current = null;
    player.seekTo(time, true);
  };

  const handleVideoEnd = () => {
    onVideoEnd();
  };

  const handleStop = useCallback(() => {
    if (mode === "GLOBAL") enterLocalMode("manual");
    const player = playerRef.current;
    if (!player?.isReady()) return;
    try {
      player.pauseProgrammatic?.();
    } catch {
      /* pause only — keep iframe mounted */
    }
  }, [enterLocalMode, mode, playerRef]);

  const showPlaybackError =
    !isNotice && Boolean(current?.channel) && !playbackUrl.trim();

  const seekBarDuration = duration > 0 ? duration : scheduleItemDuration;
  const seekBarMax = seekBarDuration > 0 ? seekBarDuration : 1;
  const title =
    (current?.channel?.title as string | undefined) ?? "Tipmanna TV";

  if (scheduleError && !items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg text-white/80">Could not load the TV schedule.</p>
        <button
          type="button"
          className="watch-transport-btn rounded-lg bg-white px-6 py-3 text-black"
          onClick={() => retryScheduleLoad()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isReady && !items.length) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-[2vmin] text-white/70"
        aria-busy="true"
      >
        Loading live TV…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative aspect-video w-full flex-1 bg-black">
        {showPreNoticeOverlay ? (
          <EnforcementPreNoticeOverlay
            title={
              mode === "GLOBAL"
                ? (current?.channel?.title ?? "Program notice")
                : (livePreNotice?.title ?? "Program notice")
            }
            remainingSec={livePreNotice?.remainingSec ?? 60}
            onReturnToLocal={
              mode === "LOCAL" && localPreNoticeSnapshot
                ? restorePreNoticeLocal
                : undefined
            }
          />
        ) : null}

        {isPlayerLoading && playbackUrl ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-white">
            Loading video…
          </div>
        ) : null}

        {showPlaybackError ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
            This schedule item has no valid YouTube link.
          </div>
        ) : playbackUrl ? (
          <TvPlayer
            key={`watch-tv-yt-${startupEmbedGeneration}`}
            ref={playerRef}
            videoUrl={effectiveEmbedPlaybackUrl}
            externallyControlled
            autoplay
            enableLiveOffsetEmbed={enableLiveOffsetEmbedFinal}
            initialStartSeconds={
              enableLiveOffsetEmbedFinal
                ? (liveOffsetEmbed?.startOffsetSeconds ?? 0)
                : 0
            }
            startupGeneration={startupEmbedGeneration}
            initialSelectedIndex={
              enableLiveOffsetEmbedFinal
                ? (liveOffsetEmbed?.selectedIndex ?? 0)
                : 0
            }
            embedSource="global"
            embedReason={
              liveOffsetEmbed?.rolledOver ? "rollover_at_embed" : "cold_start"
            }
            targetWasResolved={enableLiveOffsetEmbedFinal}
            onInitialEmbedCommitted={onInitialLiveOffsetEmbedCommitted}
            onInitialEmbedConfirmed={onInitialLiveOffsetEmbedConfirmed}
            onReady={() => {
              setIsPlayerLoading(false);
              onPlayerReady();
              flushPendingSeek();
              setPlayerVisible(true);
            }}
            onPlaybackReady={() => {
              setIsPlayerLoading(false);
              applyPendingPlaybackRestore();
              applyPendingAudioRestore();
              syncFromPlayer();
            }}
            onPlay={() => {
              setIsPlayerLoading(false);
              notifyPlayerPlaying();
              notifyStartupPlayerPlaying();
              applyPendingPlaybackRestore();
              applyPendingAudioRestore();
              syncFromPlayer();
            }}
            onPause={() => notifyPlayerPaused()}
            onUserPause={onPlayerPause}
            onUserSeek={onPlayerSeek}
            onEnd={handleVideoEnd}
            onPlayerError={handleStartupPlayerError}
            cover
          />
        ) : null}

        <div className="absolute top-[2vmin] left-[2vmin] z-20 rounded bg-black/70 px-3 py-1 text-[2vmin] font-semibold uppercase">
          {mode === "GLOBAL" ? "Live TV" : "Your TV"}
        </div>
        <div className="absolute bottom-[2vmin] left-[2vmin] z-20 max-w-[70%] truncate text-[2vmin] text-white drop-shadow">
          {title}
        </div>
      </div>

      <WatchTransportBar
        isPlaying={isPlaying}
        isMuted={isMuted}
        onPlayPause={togglePlayPause}
        onStop={handleStop}
        onMute={toggleMute}
        modeLabel={mode === "GLOBAL" ? "Live" : "Local"}
        showLive={mode === "LOCAL"}
        onLive={goLive}
        seekSlot={
          seekBarMax > 1 ? (
            <input
              type="range"
              min={0}
              max={seekBarMax}
              step={1}
              value={Math.min(currentTime, seekBarMax)}
              className="watch-transport-btn w-[min(40vw,480px)] accent-white"
              aria-label="Seek"
              onPointerDown={() => setIsSeeking(true)}
              onPointerUp={() => setIsSeeking(false)}
              onChange={e => seekTo(Number(e.target.value))}
            />
          ) : null
        }
      />
    </div>
  );
}
