"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { TvPlayerRef } from "@/components/tv/tv-player";
import {
  resolveBroadcastPosition,
  type BroadcastPosition,
} from "@/lib/tv/broadcastEngine";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { logTV } from "@/lib/tvDebugLog";
import {
  initTvAnalyticsRuntime,
  shutdownTvAnalyticsRuntime,
  trackTvModeChange,
  trackTvUserInteraction,
} from "@/lib/tvAnalytics";
import { preloadVideos } from "@/lib/preloadManager";
import { usePathname } from "next/navigation";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import {
  clearPersistedPaymentSnapshot,
  isPaymentPendingReturn,
  readPersistedPaymentSnapshot,
  setPaymentPendingReturn,
  writePersistedPaymentSnapshot,
  type PersistedTvPaymentSnapshot,
  type SchedulePlayingSlot,
} from "@/lib/tv-payment-snapshot";
import {
  acquireCommunityLiveTvChannel,
  acquireGlobalLiveTvChannel,
  releaseCommunityLiveTvChannel,
  releaseGlobalLiveTvChannel,
} from "@/hooks/use-global-tip-stream";
import { readTvSourceCommunityIdFromLocation } from "@/lib/tv-source-navigation";
import {
  collectTvScheduleEventIds,
  prefetchTvEventCatalogs,
} from "@/lib/tv-event-catalog-cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type { SchedulePlayingSlot } from "@/lib/tv-payment-snapshot";

export type TvAdjustmentCollectionPayload = {
  collectionSlot: number;
  collectionTitle: string | null;
  preferKeysFirstHalf: string[];
  preferKeysSecondHalf: string[];
} | null;

const SYNC_INTERVAL_MS = 3_000;
const DRIFT_THRESHOLD_S = 3;
const SCHEDULE_REFETCH_MS = 5 * 60 * 1000;
/** Aligned with backend HALF_DAY: refetch schedule soon after each 12h boundary */
const TV_HALF_DAY_MS = 43_200 * 1000;
const TV_BOUNDARY_REFETCH_SLACK_MS = 2_000;

function msToNextHalfDayBoundary(epochMs: number, nowMs: number): number {
  const elapsed = nowMs - epochMs;
  const mod = ((elapsed % TV_HALF_DAY_MS) + TV_HALF_DAY_MS) % TV_HALF_DAY_MS;
  return TV_HALF_DAY_MS - mod;
}
function tvScheduleStorageKey(communityId: string | null) {
  return communityId
    ? `tipmanna-tv-schedule-v1-c/${communityId}`
    : "tipmanna-tv-schedule-v1";
}

function persistTvScheduleCache(
  body: unknown,
  etag: string | null,
  communityId: string | null
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      tvScheduleStorageKey(communityId),
      JSON.stringify({ body, etag, at: Date.now() })
    );
  } catch {
    /* quota / private mode */
  }
}

function readTvScheduleCache(
  communityId: string | null
): { body: any; etag: string | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(tvScheduleStorageKey(communityId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { body?: any; etag?: string | null };
    if (!parsed?.body?.items?.length) return null;
    return { body: parsed.body, etag: parsed.etag ?? null };
  } catch {
    return null;
  }
}

const SESSION_LOCAL_INDEX_KEY = "tv-local-index";
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000] as const;
const MAX_SCHEDULE_RETRIES = 10;

export type LastLivePosition = Pick<
  BroadcastPosition,
  "scheduleIndex" | "offsetSeconds" | "loopPosition" | "totalDuration"
>;

export type TvPaymentPlaybackSnapshot = {
  mode: "GLOBAL" | "LOCAL";
  currentIndex: number;
  currentTime: number;
  wasPlaying: boolean;
  wasMuted: boolean;
  playingItemOverrideId: string | null;
  schedulePlayingSlot: SchedulePlayingSlot | null;
  localModeReason: string | null;
};

type TVContextType = {
  items: any[];
  broadcastEpoch: number | null;
  totalDuration: number;
  currentIndex: number;
  mode: "GLOBAL" | "LOCAL";
  isReady: boolean;
  isPaymentActive: boolean;
  playerRef: React.RefObject<TvPlayerRef | null>;

  /** UTC half-day block currently used for playback and `items` */
  activeBatch: "A" | "B" | null;
  /** The other block for the same calendar day (for “See more”) */
  alternateBatch: "A" | "B" | null;
  alternateBatchItems: any[];
  alternateBatchTotalDuration: number;

  /** Drift-corrected timestamp (ms) aligned with broadcast sync */
  getSyncedNow: () => number;

  /** Live schedule index from resolver; updated only in GLOBAL (frozen in LOCAL). */
  liveBroadcastIndex: number;

  lastLivePosition: LastLivePosition | null;
  lastLocalIndex: number;
  localModeReason: string | null;

  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;

  scrollToSection: (section: string) => void;
  registerSection: (key: string, el: HTMLElement | null) => void;

  goLive: () => void;
  /** Stay on current video/time; stop live sync only (Your TV). */
  switchToLocal: () => void;
  playLocal: (index: number) => void;
  /** Full TV schedule drawer — plays item without re-pinning the preview playlist. */
  playLocalFromSchedule: (index: number) => void;
  /** Index pinned to top of preview playlist (updated only by preview clicks, not schedule drawer). */
  previewPinIndex: number;
  /** Play a schedule row by item (Batch A row or Batch B row); maps to index when in active batch */
  playLocalScheduleItem: (item: any) => void;

  /** When playing a video not in active `items`, UI uses this for title/thumbnail */
  playingItemOverride: any | null;

  /** Drawer / full schedule highlight: which batch row is “playing” in LOCAL (UI-only). */
  schedulePlayingSlot: SchedulePlayingSlot | null;

  enterLocalMode: (reason: string, index?: number) => void;
  enterGlobalMode: () => void;

  onPlayerPause: () => void;
  onPlayerSeek: (seconds: number) => void;

  /** YouTube ended — GLOBAL resyncs; LOCAL advances playlist */
  onVideoEnd: () => void;

  /** TvLooper reports play/pause for payment snapshot */
  setPlayerPlayingState: (playing: boolean) => void;

  /** Notifies iframe readiness; triggers sync when becoming visible in GLOBAL */
  setPlayerVisible: (visible: boolean) => void;

  /** Half-day thematic collection applied to ongoing batch (backend meta). */
  ongoingCollection: TvAdjustmentCollectionPayload;
  upcomingCollection: TvAdjustmentCollectionPayload;

  /** Call when tip/payment UI opens: pauses player, blocks sync, snapshots mode/index/time */
  pauseForPayment: () => void;
  /**
   * Tip drawer open: if there are selected tips and still in GLOBAL, switch to LOCAL first
   * so live sync stops; otherwise same as pauseForPayment.
   */
  preparePlaybackForTipDrawer: (hasSelectedTips: boolean) => void;
  /** Refresh persisted snapshot before Stripe wallet top-up redirect (TV surfaces). */
  snapshotPlaybackForPaymentRedirect: () => void;
  /** Call when tip/payment UI closes: restores GLOBAL (live sync) or LOCAL (same index + time) */
  resumeAfterPayment: () => void;

  /** After payment + GLOBAL `syncToLive` / new video cue, restores mute/play from snapshot */
  applyPendingPlaybackRestore: () => void;

  /** Community TV: load `/communities/:id/tv/schedule`; null = Tipmanna global. */
  scheduleSourceCommunityId: string | null;
  setScheduleSourceCommunityId: (id: string | null) => void;

  scheduleError: boolean;
  /** True when playing from sessionStorage cache after a fetch failure. */
  scheduleStale: boolean;
  retryScheduleLoad: () => void;

  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;

};

const TVContext = createContext<TVContextType | null>(null);

export function useTV() {
  const ctx = useContext(TVContext);
  if (!ctx) throw new Error("GlobalTVProvider missing");
  return ctx;
}

/**
 * Deterministic TV state machine:
 * - GLOBAL: periodic sync via resolveBroadcastPosition only
 * - LOCAL: no sync
 */
export default function GlobalTVProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const playerRef = useRef<TvPlayerRef | null>(null);

  const [items, setItems] = useState<any[]>([]);
  const [broadcastEpoch, setBroadcastEpoch] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [activeBatch, setActiveBatch] = useState<"A" | "B" | null>(null);
  const [alternateBatch, setAlternateBatch] = useState<"A" | "B" | null>(null);
  const [alternateBatchItems, setAlternateBatchItems] = useState<any[]>([]);
  const [alternateBatchTotalDuration, setAlternateBatchTotalDuration] =
    useState(0);
  const [ongoingCollection, setOngoingCollection] =
    useState<TvAdjustmentCollectionPayload>(null);
  const [upcomingCollection, setUpcomingCollection] =
    useState<TvAdjustmentCollectionPayload>(null);
  const driftRef = useRef(0);

  const [mode, setMode] = useState<"GLOBAL" | "LOCAL">("GLOBAL");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playingItemOverride, setPlayingItemOverride] = useState<any | null>(
    null
  );
  const [isReady, setIsReady] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [scheduleStale, setScheduleStale] = useState(false);

  const [lastLivePosition, setLastLivePosition] =
    useState<LastLivePosition | null>(null);
  const [lastLocalIndex, setLastLocalIndex] = useState(0);
  const [localModeReason, setLocalModeReason] = useState<string | null>(null);

  const [liveBroadcastIndex, setLiveBroadcastIndex] = useState(0);
  const [schedulePlayingSlot, setSchedulePlayingSlot] =
    useState<SchedulePlayingSlot | null>(null);
  /** Preview playlist pin — only moves on preview-panel clicks, not schedule drawer. */
  const [previewPinIndex, setPreviewPinIndex] = useState(0);

  const lastSyncedIndex = useRef(-1);
  const liveBroadcastIndexRef = useRef(0);
  const activeScheduleIdRef = useRef<string | null>(null);
  const currentIndexRef = useRef(0);
  const modeRef = useRef<"GLOBAL" | "LOCAL">("GLOBAL");

  const paymentActiveRef = useRef(false);
  const paymentSnapshotRef = useRef<TvPaymentPlaybackSnapshot | null>(null);
  const pendingSchedulePayloadRef = useRef<any>(null);
  const pendingPlaybackRestoreRef = useRef<{
    wasMuted: boolean;
    wasPlaying: boolean;
  } | null>(null);
  const [isPaymentActive, setIsPaymentActive] = useState(false);
  const isPlayingRef = useRef(false);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const scheduleRetryCountRef = useRef(0);
  const scheduleRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const boundaryRefetchTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const loadScheduleRef = useRef<
    (opts?: { manual?: boolean; resetRetry?: boolean }) => Promise<void>
  >(async () => {});
  const scheduleEtagRef = useRef<string | null>(null);
  const syncMissRef = useRef(0);

  const pathname = usePathname();
  const scheduleSourceCommunityIdRef = useRef<string | null>(null);
  const [scheduleSourceCommunityId, setScheduleSourceCommunityIdState] =
    useState<string | null>(() => {
      const id = readTvSourceCommunityIdFromLocation();
      scheduleSourceCommunityIdRef.current = id;
      return id;
    });

  const setScheduleSourceCommunityId = useCallback((id: string | null) => {
    scheduleSourceCommunityIdRef.current = id;
    scheduleEtagRef.current = null;
    setScheduleSourceCommunityIdState(id);
  }, []);

  const resetPlaybackForScheduleSourceChange = useCallback(() => {
    lastSyncedIndex.current = -1;
    activeScheduleIdRef.current = null;
    syncMissRef.current = 0;
    setMode("GLOBAL");
    modeRef.current = "GLOBAL";
    setLocalModeReason(null);
    setPlayingItemOverride(null);
    setSchedulePlayingSlot(null);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setLiveBroadcastIndex(0);
    liveBroadcastIndexRef.current = 0;
    setLastLivePosition(null);
    setItems([]);
    setBroadcastEpoch(null);
    setTotalDuration(0);
    setActiveBatch(null);
    setAlternateBatch(null);
    setAlternateBatchItems([]);
    setAlternateBatchTotalDuration(0);
    setOngoingCollection(null);
    setUpcomingCollection(null);
    setIsReady(false);
    setScheduleError(false);
    setScheduleStale(false);
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/tv")) {
      scheduleSourceCommunityIdRef.current = null;
      setScheduleSourceCommunityIdState(prev => (prev !== null ? null : prev));
    }
  }, [pathname]);

  const registerSection = (key: string, el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  };

  const scrollToSection = (key: string) => {
    const el = sectionRefs.current[key];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    liveBroadcastIndexRef.current = liveBroadcastIndex;
  }, [liveBroadcastIndex]);

  useEffect(() => {
    preloadVideos(items, currentIndex);
  }, [items, currentIndex]);

  const getNow = useCallback(() => Date.now() + driftRef.current, []);
  const getSyncedNow = getNow;

  const setPlayerPlayingState = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
  }, []);

  const syncToLive = useCallback(() => {
    if (paymentActiveRef.current) return;
    if (modeRef.current !== "GLOBAL") return;
    if (!broadcastEpoch || !items.length || !totalDuration) return;

    const player = playerRef.current;
    if (!player || !player.isReady()) {
      syncMissRef.current += 1;
      if (syncMissRef.current > 15) {
        syncMissRef.current = 0;
        lastSyncedIndex.current = -1;
        void loadScheduleRef.current?.();
      }
      return;
    }
    syncMissRef.current = 0;

    const pos = resolveBroadcastPosition(
      items,
      broadcastEpoch,
      totalDuration,
      getNow()
    );

    if (!pos.item) return;

    const isNotice = pos.item.segmentKind === "notice";
    if (!isNotice && !pos.item.channel?.url) return;

    logTV("broadcast_sync", {
      mode: modeRef.current,
      currentIndex: currentIndexRef.current,
      offsetSeconds: pos.offsetSeconds,
      scheduleIndex: pos.scheduleIndex,
    });

    setLastLivePosition({
      scheduleIndex: pos.scheduleIndex,
      offsetSeconds: pos.offsetSeconds,
      loopPosition: pos.loopPosition,
      totalDuration: pos.totalDuration,
    });

    if (pos.scheduleIndex !== lastSyncedIndex.current) {
      lastSyncedIndex.current = pos.scheduleIndex;
      setCurrentIndex(pos.scheduleIndex);
      
      if (!isNotice) {
        const videoId = extractYoutubeID(pos.item.channel.url);
        if (videoId) player.load(videoId, pos.offsetSeconds);
      } else {
        player.pause();
      }
    } else if (!isNotice) {
      const actual = player.getCurrentTime();
      if (Math.abs(actual - pos.offsetSeconds) > DRIFT_THRESHOLD_S) {
        player.seekTo(pos.offsetSeconds, false);
      }
    }
  }, [broadcastEpoch, items, totalDuration, getNow]);

  const selectedIndexRef = useRef<number | null>(null);

useEffect(() => {
  selectedIndexRef.current = selectedIndex;
}, [selectedIndex]);

  const setPlayerVisible = useCallback(
    (visible: boolean) => {
      if (visible && modeRef.current === "GLOBAL") {
        queueMicrotask(() => syncToLive());
      }
    },
    [syncToLive]
  );

  const applySchedulePayloadCore = useCallback((data: any) => {
    const serverDrift = (data.serverNow ?? Date.now()) - Date.now();
    driftRef.current = serverDrift;

    const sid =
      (data.activeScheduleId as string | undefined) ??
      `${data.activeBatch ?? ""}:${(data.items as any[])?.[0]?.id ?? ""}`;
    if (activeScheduleIdRef.current !== sid) {
      lastSyncedIndex.current = -1;
      activeScheduleIdRef.current = sid;
    }

    setItems(data.items ?? []);
    prefetchTvEventCatalogs(
      collectTvScheduleEventIds((data.items as any[]) ?? [], 24)
    );
    setBroadcastEpoch(data.broadcastEpoch ?? null);
    setTotalDuration(data.totalDuration ?? 0);
    setActiveBatch(data.activeBatch ?? null);
    setAlternateBatch(data.alternateBatch ?? null);
    setAlternateBatchItems(data.alternateBatchItems ?? []);
    setAlternateBatchTotalDuration(data.alternateBatchTotalDuration ?? 0);

    const live = data.livePosition as
      | {
          scheduleIndex?: number;
          offsetSeconds?: number;
          loopPosition?: number;
          totalDuration?: number;
        }
      | undefined;
    if (
      live &&
      typeof live.scheduleIndex === "number" &&
      typeof live.offsetSeconds === "number"
    ) {
      setLastLivePosition({
        scheduleIndex: live.scheduleIndex,
        offsetSeconds: live.offsetSeconds,
        loopPosition: live.loopPosition ?? 0,
        totalDuration: live.totalDuration ?? data.totalDuration ?? 0,
      });
      setLiveBroadcastIndex(live.scheduleIndex);
    }

    const oc =
      typeof data?.ongoingCollection === "object" &&
      data.ongoingCollection != null &&
      typeof data.ongoingCollection.collectionSlot === "number"
        ? (data.ongoingCollection as NonNullable<TvAdjustmentCollectionPayload>)
        : null;
    const uc =
      typeof data?.upcomingCollection === "object" &&
      data.upcomingCollection != null &&
      typeof data.upcomingCollection.collectionSlot === "number"
        ? (data.upcomingCollection as NonNullable<TvAdjustmentCollectionPayload>)
        : null;
    setOngoingCollection(oc);
    setUpcomingCollection(uc);
  }, []);

  const applySchedulePayload = useCallback(
    (data: any) => {
      if (paymentActiveRef.current) {
        pendingSchedulePayloadRef.current = data;
        return;
      }
      pendingSchedulePayloadRef.current = null;
      applySchedulePayloadCore(data);
    },
    [applySchedulePayloadCore]
  );

  const applyPendingPlaybackRestore = useCallback(() => {
    const p = pendingPlaybackRestoreRef.current;
    if (!p) return;
    pendingPlaybackRestoreRef.current = null;
    const pl = playerRef.current;
    if (!pl?.isReady()) return;
    if (p.wasMuted) pl.mute();
    else pl.unmute();
    if (p.wasPlaying) pl.play();
  }, []);

  const loadSchedule = useCallback(
    async (opts?: { manual?: boolean; resetRetry?: boolean }) => {
      if (opts?.resetRetry) {
        scheduleRetryCountRef.current = 0;
        if (scheduleRetryTimeoutRef.current) {
          clearTimeout(scheduleRetryTimeoutRef.current);
          scheduleRetryTimeoutRef.current = null;
        }
      }

      const applySuccess = (data: any, etag: string | null) => {
        const cid = scheduleSourceCommunityIdRef.current;
        if (etag) scheduleEtagRef.current = etag;
        persistTvScheduleCache(data, etag, cid);
        applySchedulePayload(data);
        setScheduleError(false);
        setScheduleStale(false);
        setIsReady(true);
        scheduleRetryCountRef.current = 0;

        if (boundaryRefetchTimeoutRef.current) {
          clearTimeout(boundaryRefetchTimeoutRef.current);
          boundaryRefetchTimeoutRef.current = null;
        }
        const epochMs = data.broadcastEpoch as number | undefined;
        if (typeof epochMs === "number" && Number.isFinite(epochMs)) {
          const ms = msToNextHalfDayBoundary(
            epochMs,
            Date.now() + driftRef.current
          );
          boundaryRefetchTimeoutRef.current = setTimeout(() => {
            boundaryRefetchTimeoutRef.current = null;
            void loadScheduleRef.current();
          }, ms + TV_BOUNDARY_REFETCH_SLACK_MS);
        }
      };

      try {
        const cid = scheduleSourceCommunityIdRef.current;
        const res = await fetchTvScheduleAction({
          communityId: cid,
          ifNoneMatch: scheduleEtagRef.current,
        });

        if (res.success && res.data?.notModified) {
          logTV("schedule_not_modified", {
            mode: modeRef.current,
            currentIndex: currentIndexRef.current,
            offsetSeconds: null,
          });
          return;
        }

        if (!res.success || !res.data?.body) {
          throw new Error(
            res.error ?? res.message ?? "Failed to load TV schedule"
          );
        }

        const data = res.data.body;
        const etag = res.data.etag ?? null;

        logTV("schedule_loaded", {
          mode: modeRef.current,
          currentIndex: currentIndexRef.current,
          offsetSeconds: null,
          status: res.data.status,
          checksum: (data as { checksum?: string }).checksum,
          activeScheduleId: (data as { activeScheduleId?: string })
            .activeScheduleId,
        });

        applySuccess(data, etag);
        if (modeRef.current === "GLOBAL") {
          lastSyncedIndex.current = -1;
          queueMicrotask(() => syncToLive());
        }
      } catch (err) {
        console.error("Failed to load TV schedule:", err);
        const cid = scheduleSourceCommunityIdRef.current;
        const cached = readTvScheduleCache(cid);
        if (cached) {
          scheduleEtagRef.current = cached.etag ?? scheduleEtagRef.current;
          applySchedulePayload(cached.body);
          setScheduleStale(true);
          setScheduleError(false);
          setIsReady(true);
          logTV("schedule_fallback_cache", {
            mode: modeRef.current,
            currentIndex: currentIndexRef.current,
            offsetSeconds: null,
          });
          if (boundaryRefetchTimeoutRef.current) {
            clearTimeout(boundaryRefetchTimeoutRef.current);
            boundaryRefetchTimeoutRef.current = null;
          }
          const epochMs = cached.body.broadcastEpoch as number | undefined;
          if (typeof epochMs === "number" && Number.isFinite(epochMs)) {
            const ms = msToNextHalfDayBoundary(
              epochMs,
              Date.now() + driftRef.current
            );
            boundaryRefetchTimeoutRef.current = setTimeout(() => {
              boundaryRefetchTimeoutRef.current = null;
              void loadScheduleRef.current();
            }, ms + TV_BOUNDARY_REFETCH_SLACK_MS);
          }
        } else {
          setScheduleError(true);
          setIsReady(false);
        }

        const attempt = scheduleRetryCountRef.current;
        if (attempt < MAX_SCHEDULE_RETRIES) {
          const delay =
            RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
          scheduleRetryTimeoutRef.current = setTimeout(() => {
            scheduleRetryCountRef.current += 1;
            void loadSchedule();
          }, delay);
        }
      }
    },
    [applySchedulePayload, syncToLive]
  );

  useEffect(() => {
    loadScheduleRef.current = loadSchedule;
  }, [loadSchedule]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScheduleUpdated = () => {
      scheduleEtagRef.current = null;
      void loadScheduleRef.current?.({ manual: true });
    };

    const cid = scheduleSourceCommunityId;
    if (cid) {
      const ch = acquireCommunityLiveTvChannel(cid);
      if (!ch) return () => {};
      ch.bind("tv-schedule-updated", onScheduleUpdated);
      return () => {
        ch.unbind("tv-schedule-updated", onScheduleUpdated);
        releaseCommunityLiveTvChannel(cid);
      };
    }

    const channel = acquireGlobalLiveTvChannel();
    if (!channel) return () => {};
    channel.bind("tv-schedule-updated", onScheduleUpdated);
    return () => {
      channel.unbind("tv-schedule-updated", onScheduleUpdated);
      releaseGlobalLiveTvChannel();
    };
  }, [scheduleSourceCommunityId]);

  useEffect(() => {
    scheduleEtagRef.current = null;
    resetPlaybackForScheduleSourceChange();
    void loadScheduleRef.current?.({ resetRetry: true });
  }, [resetPlaybackForScheduleSourceChange, scheduleSourceCommunityId]);

  useEffect(() => {
    return () => {
      if (boundaryRefetchTimeoutRef.current) {
        clearTimeout(boundaryRefetchTimeoutRef.current);
        boundaryRefetchTimeoutRef.current = null;
      }
    };
  }, []);

  const retryScheduleLoad = useCallback(() => {
    void loadSchedule({ manual: true, resetRetry: true });
  }, [loadSchedule]);

  useEffect(() => {
    initTvAnalyticsRuntime();
    return () => shutdownTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    void loadSchedule({ resetRetry: true });
    return () => {
      if (scheduleRetryTimeoutRef.current) {
        clearTimeout(scheduleRetryTimeoutRef.current);
      }
    };
  }, [loadSchedule]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadSchedule();
    }, SCHEDULE_REFETCH_MS);
    return () => clearInterval(id);
  }, [loadSchedule]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void loadSchedule();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadSchedule]);

  /** Live broadcast index for preview — GLOBAL only (no background resolver in LOCAL). */
  useEffect(() => {
    if (mode !== "GLOBAL") return;
    if (!broadcastEpoch || !items.length || !totalDuration) return;

    const tick = () => {
      const pos = resolveBroadcastPosition(
        items,
        broadcastEpoch,
        totalDuration,
        getNow()
      );
      if (!pos.item) return;
      setLiveBroadcastIndex(pos.scheduleIndex);
    };

    tick();
    const id = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mode, broadcastEpoch, items, totalDuration, getNow]);

  useEffect(() => {
    if (mode !== "GLOBAL") return;
    if (!broadcastEpoch || !items.length || !totalDuration) return;

    syncToLive();

    const interval = setInterval(syncToLive, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mode, broadcastEpoch, items, totalDuration, syncToLive]);

  const enterLocalMode = useCallback((reason: string, index?: number) => {
    const fromMode = modeRef.current;
    setLocalModeReason(reason);
    lastSyncedIndex.current = -1;

    const wasGlobal = modeRef.current === "GLOBAL";
    setMode("LOCAL");
    modeRef.current = "LOCAL";

    if (index !== undefined) {
      setCurrentIndex(index);
      currentIndexRef.current = index;
      setLastLocalIndex(index);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_LOCAL_INDEX_KEY, String(index));
      }
    } else if (wasGlobal) {
      setLastLocalIndex(currentIndexRef.current);
      setSchedulePlayingSlot({
        scope: "active",
        rowIndex: liveBroadcastIndexRef.current,
      });
    }

    if (fromMode !== "LOCAL") {
      trackTvModeChange(fromMode, "LOCAL", reason);
      logTV("mode_enter_local", {
        mode: "LOCAL",
        reason,
        currentIndex: currentIndexRef.current,
        offsetSeconds: null,
      });
    }
  }, []);

  const enterGlobalMode = useCallback(() => {
    const fromMode = modeRef.current;
    setLocalModeReason(null);
    setPlayingItemOverride(null);
    setSchedulePlayingSlot(null);
    setMode("GLOBAL");
    modeRef.current = "GLOBAL";
    lastSyncedIndex.current = -1;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_LOCAL_INDEX_KEY);
    }
    if (fromMode !== "GLOBAL") {
      trackTvModeChange(fromMode, "GLOBAL", "enter_global");
      logTV("mode_enter_global", {
        mode: "GLOBAL",
        currentIndex: currentIndexRef.current,
        offsetSeconds: null,
      });
    }
    syncToLive();
    queueMicrotask(() => syncToLive());
  }, [syncToLive]);

  const goLive = enterGlobalMode;

  const switchToLocal = useCallback(() => {
    const idx = currentIndexRef.current;
    setSchedulePlayingSlot({ scope: "active", rowIndex: idx });
    enterLocalMode("manual", idx);
  }, [enterLocalMode]);

  const loadLocalAtIndex = useCallback(
    (
      index: number,
      opts: { source: "preview" | "schedule"; updatePreviewPin: boolean }
    ) => {
      setPlayingItemOverride(null);
      setSchedulePlayingSlot({
        scope: "active",
        rowIndex: index,
        source: opts.source,
      });
      if (opts.updatePreviewPin) {
        setPreviewPinIndex(index);
      }
      enterLocalMode("playlist", index);

      const item = items[index];
      if (!item) return;

      const player = playerRef.current;
      if (!player || !player.isReady()) return;

      const videoId = extractYoutubeID(item.channel.url);
      if (videoId) player.load(videoId, 0);
    },
    [items, enterLocalMode]
  );

  const playLocal = useCallback(
    (index: number) => {
      trackTvUserInteraction("click", "playlist");
      setSelectedIndex(index);
      loadLocalAtIndex(index, { source: "preview", updatePreviewPin: true });
    },
    [loadLocalAtIndex]
  );

  const playLocalFromSchedule = useCallback(
    (index: number) => {
      trackTvUserInteraction("click", "schedule_row");

      setSelectedIndex(index);
      setPreviewPinIndex(index);

      loadLocalAtIndex(index, { source: "schedule", updatePreviewPin: false });
    },
    [loadLocalAtIndex]
  );

  const playLocalScheduleItem = useCallback(
    (item: any) => {
      trackTvUserInteraction("click", "schedule_row");
      if (!item?.channel?.url) return;
      const idx = items.findIndex((i: any) => i.id === item.id);
      if (idx >= 0) {
        playLocalFromSchedule(idx);
        return;
      }
      const altIdx = alternateBatchItems.findIndex(
        (i: any) => i.id === item.id
      );
      if (altIdx < 0) return;

      setPlayingItemOverride(item);
      setSchedulePlayingSlot({ scope: "alternate", rowIndex: altIdx });
      const anchor = liveBroadcastIndexRef.current;
      enterLocalMode("playlist", anchor);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_LOCAL_INDEX_KEY, String(anchor));
      }
      const player = playerRef.current;
      if (!player || !player.isReady()) return;
      const videoId = extractYoutubeID(item.channel.url);
      if (videoId) player.load(videoId, 0);
    },
    [items, alternateBatchItems, enterLocalMode, playLocalFromSchedule]
  );

  const onVideoEnd = useCallback(() => {
    if (paymentActiveRef.current) return;

    if (modeRef.current !== "GLOBAL") {
      const len = items.length;
      if (len < 1) return;
      if (len < 2) {
        playLocal(0);
        return;
      }
      playLocal((currentIndexRef.current + 1) % len);
      return;
    }

    syncToLive();
  }, [items.length, playLocal, syncToLive]);

  const onPlayerPause = useCallback(() => {
    if (paymentActiveRef.current) return;
    if (modeRef.current !== "GLOBAL") return;
    trackTvUserInteraction("pause", null);
    enterLocalMode("pause");
  }, [enterLocalMode]);

  const onPlayerSeek = useCallback(
    (seconds: number) => {
      if (paymentActiveRef.current) return;
      if (modeRef.current !== "GLOBAL") return;
      trackTvUserInteraction("seek", String(Math.round(seconds)));
      enterLocalMode("seek");
    },
    [enterLocalMode]
  );

  const pauseForPayment = useCallback(() => {
    const player = playerRef.current;
    const snap: TvPaymentPlaybackSnapshot = {
      mode: modeRef.current,
      currentIndex: currentIndexRef.current,
      currentTime: player?.isReady() ? player.getCurrentTime() : 0,
      wasPlaying: isPlayingRef.current,
      wasMuted: player?.isReady() ? player.isMuted() : false,
      playingItemOverrideId:
        (playingItemOverride as { id?: string } | null)?.id ?? null,
      schedulePlayingSlot,
      localModeReason,
    };
    paymentSnapshotRef.current = snap;
    const persisted: PersistedTvPaymentSnapshot = { v: 1, ...snap };
    writePersistedPaymentSnapshot(persisted);
    paymentActiveRef.current = true;
    setIsPaymentActive(true);
    player?.pause();
  }, [playingItemOverride, schedulePlayingSlot, localModeReason]);

  const preparePlaybackForTipDrawer = useCallback(
    (hasSelectedTips: boolean) => {
      if (!hasSelectedTips) {
        pauseForPayment();
        return;
      }
      const player = playerRef.current;
      if (modeRef.current === "GLOBAL") {
        enterLocalMode("tip_drawer", currentIndexRef.current);
      }
      const idx = currentIndexRef.current;
      const wasPlayingBefore = isPlayingRef.current;
      const snap: TvPaymentPlaybackSnapshot = {
        mode: "LOCAL",
        currentIndex: idx,
        currentTime: player?.isReady() ? player.getCurrentTime() : 0,
        wasPlaying: wasPlayingBefore,
        wasMuted: player?.isReady() ? player.isMuted() : false,
        playingItemOverrideId:
          (playingItemOverride as { id?: string } | null)?.id ?? null,
        schedulePlayingSlot: { scope: "active", rowIndex: idx },
        localModeReason: "tip_drawer",
      };
      paymentSnapshotRef.current = snap;
      writePersistedPaymentSnapshot({ v: 1, ...snap });
      paymentActiveRef.current = true;
      setIsPaymentActive(true);
      player?.pause();
    },
    [pauseForPayment, enterLocalMode, playingItemOverride]
  );

  const snapshotPlaybackForPaymentRedirect = useCallback(() => {
    const player = playerRef.current;
    const snap: TvPaymentPlaybackSnapshot = {
      mode: modeRef.current === "GLOBAL" ? "LOCAL" : modeRef.current,
      currentIndex: currentIndexRef.current,
      currentTime: player?.isReady() ? player.getCurrentTime() : 0,
      wasPlaying: isPlayingRef.current,
      wasMuted: player?.isReady() ? player.isMuted() : false,
      playingItemOverrideId:
        (playingItemOverride as { id?: string } | null)?.id ?? null,
      schedulePlayingSlot,
      localModeReason:
        modeRef.current === "GLOBAL" ? "payment_redirect" : localModeReason,
    };
    writePersistedPaymentSnapshot({ v: 1, ...snap });
    if (paymentSnapshotRef.current) {
      paymentSnapshotRef.current = snap;
    }
    setPaymentPendingReturn(true);
  }, [playingItemOverride, schedulePlayingSlot, localModeReason]);

  const resumeAfterPayment = useCallback(() => {
    const snap = paymentSnapshotRef.current;
    paymentSnapshotRef.current = null;
    clearPersistedPaymentSnapshot();
    setPaymentPendingReturn(false);

    const flushPendingSchedule = () => {
      const pendingData = pendingSchedulePayloadRef.current;
      if (pendingData) {
        pendingSchedulePayloadRef.current = null;
        applySchedulePayloadCore(pendingData);
      }
    };

    const resolveOverride = (id: string | null) => {
      if (!id) return null;
      return (
        items.find((i: any) => i.id === id) ??
        alternateBatchItems.find((i: any) => i.id === id) ??
        null
      );
    };

    if (!snap) {
      flushPendingSchedule();
      paymentActiveRef.current = false;
      setIsPaymentActive(false);
      return;
    }

    const player = playerRef.current;

    if (snap.mode === "GLOBAL") {
      flushPendingSchedule();
      setLocalModeReason(null);
      setPlayingItemOverride(null);
      setSchedulePlayingSlot(null);
      setMode("GLOBAL");
      modeRef.current = "GLOBAL";
      lastSyncedIndex.current = -1;
      pendingPlaybackRestoreRef.current = {
        wasMuted: snap.wasMuted,
        wasPlaying: snap.wasPlaying,
      };
      paymentActiveRef.current = false;
      setIsPaymentActive(false);
      syncToLive();
      window.setTimeout(() => {
        applyPendingPlaybackRestore();
      }, 350);
      return;
    }

    flushPendingSchedule();
    if (!player?.isReady()) {
      paymentActiveRef.current = false;
      setIsPaymentActive(false);
      return;
    }

    setPlayingItemOverride(resolveOverride(snap.playingItemOverrideId));
    setSchedulePlayingSlot(snap.schedulePlayingSlot);
    setLocalModeReason(snap.localModeReason);

    setMode("LOCAL");
    modeRef.current = "LOCAL";
    setCurrentIndex(snap.currentIndex);
    currentIndexRef.current = snap.currentIndex;
    player.seekTo(snap.currentTime, false);
    paymentActiveRef.current = false;
    setIsPaymentActive(false);
    if (snap.wasMuted) player.mute();
    else player.unmute();
    if (snap.wasPlaying) player.play();
  }, [
    items,
    alternateBatchItems,
    applySchedulePayloadCore,
    syncToLive,
    applyPendingPlaybackRestore,
  ]);

  useEffect(() => {
    /** Re-sync live position when returning to the TV page without resetting the broadcast timeline. */
    const handler = () => {
      lastSyncedIndex.current = -1;
      if (modeRef.current === "GLOBAL") {
        queueMicrotask(() => syncToLive());
      }
    };

    window.addEventListener("tv-page-open", handler);
    return () => window.removeEventListener("tv-page-open", handler);
  }, [syncToLive]);

  /** Restore TV state after full-page return from `/success` (Stripe); same-session uses `resumeAfterPayment`. */
  useEffect(() => {
    if (!isReady || !items.length) return;
    if (!isPaymentPendingReturn()) return;
    const persisted = readPersistedPaymentSnapshot();
    /** Defer clearing `payment_pending_return` so `useWalletTopupTipResume` can run in the same passive flush. */
    const clearPendingReturnSoon = () =>
      queueMicrotask(() => setPaymentPendingReturn(false));
    if (!persisted) {
      clearPersistedPaymentSnapshot();
      clearPendingReturnSoon();
      return;
    }
    clearPersistedPaymentSnapshot();

    const resolveOverride = (id: string | null) => {
      if (!id) return null;
      return (
        items.find((i: any) => i.id === id) ??
        alternateBatchItems.find((i: any) => i.id === id) ??
        null
      );
    };

    if (persisted.mode === "GLOBAL") {
      setLocalModeReason(null);
      setPlayingItemOverride(null);
      setSchedulePlayingSlot(null);
      setMode("GLOBAL");
      modeRef.current = "GLOBAL";
      lastSyncedIndex.current = -1;
      paymentActiveRef.current = false;
      setIsPaymentActive(false);
      pendingPlaybackRestoreRef.current = {
        wasMuted: persisted.wasMuted,
        wasPlaying: persisted.wasPlaying,
      };
      queueMicrotask(() => {
        syncToLive();
        window.setTimeout(() => {
          applyPendingPlaybackRestore();
        }, 350);
      });
      clearPendingReturnSoon();
      return;
    }

    setPlayingItemOverride(resolveOverride(persisted.playingItemOverrideId));
    setSchedulePlayingSlot(persisted.schedulePlayingSlot);
    setLocalModeReason(persisted.localModeReason);
    setMode("LOCAL");
    modeRef.current = "LOCAL";
    setCurrentIndex(persisted.currentIndex);
    currentIndexRef.current = persisted.currentIndex;
    paymentActiveRef.current = false;
    setIsPaymentActive(false);
    queueMicrotask(() => {
      const p = playerRef.current;
      if (!p?.isReady()) return;
      p.seekTo(persisted.currentTime, false);
      if (persisted.wasMuted) p.mute();
      else p.unmute();
      if (persisted.wasPlaying) p.play();
    });
    clearPendingReturnSoon();
  }, [
    isReady,
    items,
    alternateBatchItems,
    syncToLive,
    applyPendingPlaybackRestore,
  ]);

  return (
    <TVContext.Provider
      value={{
        items,
        broadcastEpoch,
        totalDuration,
        currentIndex,
        mode,
        isReady,
        isPaymentActive,
        playerRef,

        activeBatch,
        alternateBatch,
        alternateBatchItems,
        alternateBatchTotalDuration,
        getSyncedNow,

        liveBroadcastIndex,

        lastLivePosition,
        lastLocalIndex,
        localModeReason,

        selectedTag,
        setSelectedTag,

        scrollToSection,
        registerSection,

        goLive,
        switchToLocal,
        playLocal,
        playLocalFromSchedule,
        previewPinIndex,
        playLocalScheduleItem,
        playingItemOverride,
        schedulePlayingSlot,

        enterLocalMode,
        enterGlobalMode,

        onPlayerPause,
        onPlayerSeek,

        onVideoEnd,
        setPlayerPlayingState,
        setPlayerVisible,

        pauseForPayment,
        preparePlaybackForTipDrawer,
        snapshotPlaybackForPaymentRedirect,
        resumeAfterPayment,
        applyPendingPlaybackRestore,

        ongoingCollection,
        upcomingCollection,

        scheduleError,
        scheduleStale,
        retryScheduleLoad,

        scheduleSourceCommunityId,
        setScheduleSourceCommunityId,

        selectedIndex,
setSelectedIndex,
      }}
    >
      {children}
    </TVContext.Provider>
  );
}
