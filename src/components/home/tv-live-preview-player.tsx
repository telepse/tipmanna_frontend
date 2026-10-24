"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleStop, Pause, Play, Volume2, VolumeX } from "lucide-react";

import TvPlayer, { type TvPlayerRef } from "@/components/tv/tv-player";
import { EnforcementPreNoticeOverlay } from "@/components/tv/enforcement-pre-notice-overlay";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { fetchTvScheduleClient } from "@/lib/tv-schedule-client-fetch";
import { persistTvScheduleSessionCache } from "@/lib/tv-schedule-session-cache";
import { useTvPlayerControls } from "@/hooks/use-tv-player-controls";
import {
  computeNoticeRemainingSec,
  findBootstrapPlayableUrl,
  isNoticeScheduleItem,
  parseTvSchedulePayload,
  resolveLivePreviewPlayback,
  resolvePreviewPlaybackUrl,
  shouldIssuePreviewLoad,
  shouldSwitchPreviewItem,
  type LivePreviewPlayback,
  type ParsedTvSchedulePayload,
  type TvPreviewMode,
} from "@/lib/tv-live-preview";
import type { ScheduleItem } from "@/lib/tv/broadcastResolver";
import { cn } from "@/lib/utils";
import {
  buildHomepagePreviewAnalyticsContext,
  initHomepagePreviewAnalyticsRuntime,
  syncHomepagePreviewAnalyticsContext,
  trackHomepagePreviewVideoEncounter,
  trackHomepagePreviewVideoStart,
  trackHomepagePreviewWatchDuration,
} from "@/lib/analytics/homepage-preview-analytics";

const LIVE_FOLLOW_MS = 2000;

function previewPlaybackIds(item: ScheduleItem | null): {
  eventId: string | null;
  channelId: string | null;
} {
  const ch = item?.channel as
    | { id?: string; eventId?: string; event?: { id?: string } }
    | undefined;
  return {
    channelId: ch?.id != null ? String(ch.id) : null,
    eventId: ch?.eventId ?? ch?.event?.id ?? null,
  };
}

type Props = {
  isNarrow?: boolean;
};

export function TvLivePreviewPlayer({ isNarrow = false }: Props) {
  const playerRef = useRef<TvPlayerRef | null>(null);
  const [mode, setMode] = useState<TvPreviewMode>("GLOBAL");
  const [schedule, setSchedule] = useState<ParsedTvSchedulePayload | null>(
    null
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedPlayback, setLoadedPlayback] =
    useState<LivePreviewPlayback | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [embedReady, setEmbedReady] = useState(false);
  const [liveLoopPosition, setLiveLoopPosition] = useState(0);

  const lastPlayableUrlRef = useRef("");
  const etagRef = useRef<string | null>(null);
  const initialLiveAppliedRef = useRef(false);
  const embedVideoUrlRef = useRef("");
  const embedStartSecondsRef = useRef(0);
  const embedEnableLiveOffsetRef = useRef(false);
  const loadedScheduleIndexRef = useRef<number | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const pendingLoadRef = useRef<{ videoId: string; start: number } | null>(
    null
  );
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [, setPlayerPlayingState] = useState(false);
  const encounterLoggedForItemRef = useRef<string | null>(null);
  const watchSegStartRef = useRef(0);
  const prevPlayingForStartRef = useRef(false);
  const isPlayingRef = useRef(false);

  const enterLocalMode = useCallback((_reason: string) => {
    setMode("LOCAL");
  }, []);

  const goLive = useCallback(() => {
    setMode("GLOBAL");
  }, []);

  const {
    isPlaying,
    isMuted,
    togglePlayPause,
    toggleMute,
    stopPlayer,
    notifyPlayerPlaying,
    notifyPlayerPaused,
    syncFromPlayer,
  } = useTvPlayerControls({
    playerRef,
    mode,
    enterLocalMode,
    setPlayerPlayingState,
  });

  const currentItem = loadedPlayback?.item ?? null;

  useEffect(() => {
    initHomepagePreviewAnalyticsRuntime();
  }, []);

  const analyticsCtx = useMemo(
    () =>
      buildHomepagePreviewAnalyticsContext({
        ...previewPlaybackIds(currentItem),
        scheduleItemId: currentItem?.id ?? null,
      }),
    [currentItem]
  );

  useEffect(() => {
    void syncHomepagePreviewAnalyticsContext(analyticsCtx);
  }, [analyticsCtx]);

  useEffect(() => {
    encounterLoggedForItemRef.current = null;
  }, [currentItem?.id]);

  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (isPlaying && !prevPlayingForStartRef.current && currentItem?.id) {
      trackHomepagePreviewVideoStart(
        analyticsCtx,
        String(currentItem.id),
        mode === "GLOBAL" ? "GLOBAL" : "LOCAL",
        loadedScheduleIndexRef.current ?? 0,
        analyticsCtx.channelId ?? undefined
      );
    }
    prevPlayingForStartRef.current = isPlaying;
  }, [isPlaying, analyticsCtx, currentItem?.id, mode]);

  useEffect(() => {
    if (!isPlaying) {
      if (watchSegStartRef.current > 0 && currentItem?.id) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackHomepagePreviewWatchDuration(
            analyticsCtx,
            String(currentItem.id),
            Math.min(sec, 600),
            mode === "GLOBAL" ? "GLOBAL" : "LOCAL",
            analyticsCtx.channelId ?? undefined
          );
        }
      }
      return;
    }
    if (document.visibilityState !== "visible") return;
    watchSegStartRef.current = Date.now();
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !isPlayingRef.current) {
        return;
      }
      if (watchSegStartRef.current <= 0 || !currentItem?.id) return;
      const now = Date.now();
      const sec = (now - watchSegStartRef.current) / 1000;
      watchSegStartRef.current = now;
      if (sec > 0.3) {
        trackHomepagePreviewWatchDuration(
          analyticsCtx,
          String(currentItem.id),
          Math.min(sec, 300),
          modeRef.current === "GLOBAL" ? "GLOBAL" : "LOCAL",
          analyticsCtx.channelId ?? undefined
        );
      }
    }, 15_000);
    return () => {
      clearInterval(tick);
      if (watchSegStartRef.current > 0 && currentItem?.id) {
        const sec = (Date.now() - watchSegStartRef.current) / 1000;
        watchSegStartRef.current = 0;
        if (sec > 0.3) {
          trackHomepagePreviewWatchDuration(
            analyticsCtx,
            String(currentItem.id),
            Math.min(sec, 300),
            modeRef.current === "GLOBAL" ? "GLOBAL" : "LOCAL",
            analyticsCtx.channelId ?? undefined
          );
        }
      }
    };
  }, [isPlaying, analyticsCtx, currentItem?.id, mode]);

  const emitHomepagePreviewEncounter = useCallback(() => {
    if (!currentItem?.id) return;
    if (encounterLoggedForItemRef.current === currentItem.id) return;
    encounterLoggedForItemRef.current = currentItem.id;
    void syncHomepagePreviewAnalyticsContext(analyticsCtx).then(() => {
      trackHomepagePreviewVideoEncounter(analyticsCtx, {
        mode: modeRef.current === "GLOBAL" ? "GLOBAL" : "LOCAL",
        scheduleIndex: loadedScheduleIndexRef.current ?? 0,
        scheduleItemId: String(currentItem.id),
      });
    });
  }, [analyticsCtx, currentItem?.id]);

  const flushPendingLoad = useCallback(() => {
    const pending = pendingLoadRef.current;
    if (!pending) return;
    const player = playerRef.current;
    if (!player) return;
    player.load(pending.videoId, pending.start);
    pendingLoadRef.current = null;
    setIsPlayerLoading(true);
  }, []);

  const issueLoad = useCallback((videoId: string, start: number) => {
    pendingLoadRef.current = { videoId, start };
    const player = playerRef.current;
    if (player) {
      player.load(videoId, start);
      pendingLoadRef.current = null;
    }
    setIsPlayerLoading(true);
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setScheduleError(null);
    try {
      const res = await fetchTvScheduleClient({
        ifNoneMatch: etagRef.current,
      });
      if (res.success && res.data?.notModified) {
        setLoading(false);
        return;
      }
      if (!res.success) {
        throw new Error(res.error ?? "Could not load TV schedule");
      }
      if (!res.data?.body) {
        throw new Error("Could not load TV schedule");
      }
      etagRef.current = res.data.etag ?? etagRef.current;
      persistTvScheduleSessionCache(res.data.body, res.data.etag ?? null, null);
      setSchedule(parseTvSchedulePayload(res.data.body));
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : "Could not load TV schedule"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const bootstrapPlayableUrl = useMemo(
    () => findBootstrapPlayableUrl(schedule?.items ?? []),
    [schedule?.items]
  );

  const resolveCurrentLivePlayback = useCallback(
    (preferServerLivePosition: boolean): LivePreviewPlayback | null => {
      if (!schedule?.items.length || schedule.broadcastEpoch == null) {
        return null;
      }
      return resolveLivePreviewPlayback(
        schedule.items,
        schedule.broadcastEpoch,
        schedule.totalDuration,
        Date.now(),
        preferServerLivePosition ? schedule.livePosition : null
      );
    },
    [schedule]
  );

  const applyLivePlayback = useCallback(
    (playback: LivePreviewPlayback, force = false) => {
      const item = playback.item;
      const isNotice = isNoticeScheduleItem(item);
      const url = resolvePreviewPlaybackUrl(
        item,
        lastPlayableUrlRef.current,
        bootstrapPlayableUrl
      );
      if (url && !isNotice) {
        lastPlayableUrlRef.current = url;
      }

      const videoId = extractYoutubeID(url);
      const embedEstablished = embedVideoUrlRef.current.length > 0;
      const shouldSwitch = shouldSwitchPreviewItem({
        mode: modeRef.current,
        liveScheduleIndex: playback.scheduleIndex,
        loadedScheduleIndex: loadedScheduleIndexRef.current ?? -1,
        liveVideoId: videoId,
        loadedVideoId: loadedVideoIdRef.current,
      });

      if (
        !force &&
        embedEstablished &&
        !shouldSwitch &&
        modeRef.current === "GLOBAL"
      ) {
        setLiveLoopPosition(playback.loopPosition);
        return;
      }

      if (
        !force &&
        embedEstablished &&
        !shouldSwitch &&
        modeRef.current === "LOCAL"
      ) {
        return;
      }

      if (isNotice) {
        loadedScheduleIndexRef.current = playback.scheduleIndex;
        setLoadedPlayback(playback);
        if (modeRef.current === "GLOBAL") {
          setLiveLoopPosition(playback.loopPosition);
        }
        return;
      }

      if (!videoId) return;

      loadedScheduleIndexRef.current = playback.scheduleIndex;
      loadedVideoIdRef.current = videoId;
      setLoadedPlayback(playback);
      setLiveLoopPosition(playback.loopPosition);

      if (!embedEstablished) {
        embedVideoUrlRef.current = url;
        embedStartSecondsRef.current = playback.offsetSeconds;
        embedEnableLiveOffsetRef.current =
          playback.offsetSeconds > 0 && !isNotice;
        setEmbedReady(true);
        return;
      }

      if (
        shouldIssuePreviewLoad({
          force,
          embedEstablished,
          shouldSwitch,
        })
      ) {
        issueLoad(videoId, playback.offsetSeconds);
      }
    },
    [bootstrapPlayableUrl, issueLoad]
  );

  useEffect(() => {
    if (!schedule || mode !== "GLOBAL") return;
    const preferServer = !initialLiveAppliedRef.current;
    const playback = resolveCurrentLivePlayback(preferServer);
    if (!playback) return;
    if (preferServer) initialLiveAppliedRef.current = true;
    applyLivePlayback(playback, !embedVideoUrlRef.current);
  }, [schedule, mode, applyLivePlayback, resolveCurrentLivePlayback]);

  useEffect(() => {
    if (mode !== "GLOBAL" || !schedule?.items.length) return undefined;
    const id = window.setInterval(() => {
      const playback = resolveCurrentLivePlayback(false);
      if (playback) applyLivePlayback(playback);
    }, LIVE_FOLLOW_MS);
    return () => window.clearInterval(id);
  }, [mode, schedule, applyLivePlayback, resolveCurrentLivePlayback]);

  const handleGoLive = useCallback(() => {
    goLive();
    modeRef.current = "GLOBAL";
    const playback = resolveCurrentLivePlayback(false);
    if (playback) applyLivePlayback(playback, true);
  }, [applyLivePlayback, goLive, resolveCurrentLivePlayback]);

  const handleUserPause = useCallback(() => {
    if (mode === "GLOBAL") enterLocalMode("pause");
  }, [enterLocalMode, mode]);

  const handleVideoEnd = useCallback(() => {
    if (mode !== "GLOBAL") return;
    const playback = resolveCurrentLivePlayback(false);
    if (playback) applyLivePlayback(playback, true);
  }, [applyLivePlayback, mode, resolveCurrentLivePlayback]);

  const isNotice = isNoticeScheduleItem(currentItem);
  const noticeRemainingSec = computeNoticeRemainingSec(
    currentItem,
    liveLoopPosition
  );

  const embedVideoUrl = embedVideoUrlRef.current;
  const embedStartSeconds = embedStartSecondsRef.current;
  const enableLiveOffsetEmbed = embedEnableLiveOffsetRef.current;

  if (loading && !schedule) {
    return (
      <div
        className="bg-muted/50 flex min-h-[320px] items-center justify-center rounded-lg"
        aria-busy="true"
      >
        <span className="text-muted-foreground animate-pulse text-sm">
          Loading live TV…
        </span>
      </div>
    );
  }

  if (scheduleError && !schedule) {
    return (
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Could not load the live TV schedule.{" "}
        <button
          type="button"
          className="font-medium underline"
          onClick={() => void loadSchedule()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-black",
        isNarrow ? "min-h-[320px]" : "min-h-[380px]"
      )}
    >
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={togglePlayPause}
          className="rounded bg-black/60 p-1.5 text-white"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
        </button>
        <button
          type="button"
          onClick={stopPlayer}
          className="rounded bg-black/60 p-1.5 text-white"
          aria-label="Stop"
        >
          <CircleStop className="size-5 fill-white text-black" />
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="rounded bg-black/60 p-1.5 text-white"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="size-5 text-red-400" />
          ) : (
            <Volume2 className="size-5" />
          )}
        </button>
      </div>

      {mode === "GLOBAL" ? (
        <div className="bg-destructive absolute top-1 right-1 z-20 px-2 py-0.5 text-xs font-medium text-white">
          LIVE
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGoLive}
          className="absolute top-1 right-1 z-20 bg-black/80 px-2 py-1 text-xs text-white"
        >
          Back to Live
        </button>
      )}

      <div className="relative h-full min-h-[320px] w-full">
        {embedReady && embedVideoUrl ? (
          <TvPlayer
            ref={playerRef}
            videoUrl={embedVideoUrl}
            externallyControlled
            autoplay
            cover
            enableLiveOffsetEmbed={enableLiveOffsetEmbed}
            initialStartSeconds={enableLiveOffsetEmbed ? embedStartSeconds : 0}
            onReady={() => {
              flushPendingLoad();
              syncFromPlayer();
              setIsPlayerLoading(false);
              emitHomepagePreviewEncounter();
            }}
            onPlay={() => {
              notifyPlayerPlaying();
              syncFromPlayer();
              setIsPlayerLoading(false);
              emitHomepagePreviewEncounter();
            }}
            onPause={() => notifyPlayerPaused()}
            onUserPause={handleUserPause}
            onEnd={handleVideoEnd}
            onPlaybackReady={() => {
              flushPendingLoad();
              setIsPlayerLoading(false);
            }}
          />
        ) : null}

        {isNotice && currentItem ? (
          <EnforcementPreNoticeOverlay
            title={
              (currentItem as ScheduleItem).blockTitle?.trim() ||
              "Program notice"
            }
            remainingSec={noticeRemainingSec}
          />
        ) : null}

        {isPlayerLoading && embedReady ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="text-sm text-white/80">Loading…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
