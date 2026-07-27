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
  type ScheduleItem,
} from "@/lib/tv/broadcastEngine";
import { extractYoutubeID } from "@/lib/extractYoutubeID";
import { logTV, tvLoadMark, tvTrace } from "@/lib/tvDebugLog";
import {
  getTvStartupTraceId,
  hashShortId,
  markTvStartupNavigation,
  createScheduleAttemptId,
  nextScheduleAttemptNumber,
  tvStartupEvent,
  updateTvStartupContext,
} from "@/lib/tv-startup-trace";
import {
  isSameOrchestratedPlayback,
  type TvPlaybackRequest,
} from "@/lib/tv-playback-request";
import {
  applyPaymentPlaybackRestore,
  applyPendingAudioRestore as applyPendingAudioRestoreHelper,
  playWithUserGesture,
  prepareMutedLoadForAutoplay,
  type PendingAudioRestore,
} from "@/lib/tv-autoplay";
import {
  initTvAnalyticsRuntime,
  shutdownTvAnalyticsRuntime,
  trackTvModeChange,
  trackTvUserInteraction,
} from "@/lib/tvAnalytics";
import { preloadVideos } from "@/lib/preloadManager";
import { schedulePostTtfvIdle } from "@/lib/tv-post-ttfv-idle";
import { usePathname } from "next/navigation";
import { fetchTvScheduleAction } from "@/actions/tv-schedule";
import { fetchTvScheduleClient } from "@/lib/tv-schedule-client-fetch";
import {
  isTvDirectScheduleFetchEnabled,
  isTvScheduleSwrEnabled,
  isTvSingleStartupScheduleEnabled,
} from "@/lib/tv-feature-flags";
import {
  resolveScheduleSourceChange,
  resolveSessionCacheBootstrap,
  shouldSuppressVisibilityScheduleRefresh,
  snapshotPreNavigationScheduleCacheKeys,
  tvScheduleSessionCacheKey,
} from "@/lib/tv-single-startup-schedule";
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
import {
  fetchCommunityProgramBootstrap,
  fetchGlobalProgramBootstrap,
} from "@/lib/program-api";
import {
  createTvScheduleLoadCoalescer,
  isScheduleResponseStale,
} from "@/lib/tv-schedule-load-coalesce";

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
  return tvScheduleSessionCacheKey(communityId);
}

function persistTvScheduleCache(
  body: unknown,
  etag: string | null,
  communityId: string | null,
  onWritten?: (cacheKey: string) => void
) {
  if (typeof window === "undefined") return;
  try {
    const key = tvScheduleStorageKey(communityId);
    sessionStorage.setItem(key, JSON.stringify({ body, etag, at: Date.now() }));
    onWritten?.(key);
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

function isEnforcementScheduleItem(
  item: ScheduleItem | null | undefined,
  enforcementId: string
): item is ScheduleItem & {
  segmentKind: "enforcement";
  enforcementId: string;
} {
  return Boolean(
    item &&
      item.segmentKind === "enforcement" &&
      item.enforcementId === enforcementId
  );
}

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
  /** Deep link from reminder email: play enforced program/video on TV. */
  playEnforcementProgram: (
    enforcementId: string,
    communityId?: string | null
  ) => Promise<void>;

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

  /** After programmatic load (CUED/PLAYING), completes muted autoplay policy. */
  applyPendingAudioRestore: () => void;

  /** Clear provider player ref when TvPlayer unmounts (orientation-safe). */
  unregisterTvPlayer: () => void;

  /** Reload the current orchestrated video at a time (error recovery from looper). */
  reloadCurrentPlaybackAt: (startSeconds: number) => void;

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

const noop = () => {};
const noopAsync = async () => {};

function createFallbackTvContext(): TVContextType {
  return {
    items: [],
    broadcastEpoch: null,
    totalDuration: 0,
    currentIndex: 0,
    mode: "GLOBAL",
    isReady: false,
    isPaymentActive: false,
    playerRef: { current: null },
    activeBatch: null,
    alternateBatch: null,
    alternateBatchItems: [],
    alternateBatchTotalDuration: 0,
    getSyncedNow: () => Date.now(),
    liveBroadcastIndex: 0,
    lastLivePosition: null,
    lastLocalIndex: 0,
    localModeReason: null,
    selectedTag: null,
    setSelectedTag: noop,
    scrollToSection: noop,
    registerSection: noop,
    goLive: noop,
    switchToLocal: noop,
    playLocal: noop,
    playLocalFromSchedule: noop,
    previewPinIndex: 0,
    playLocalScheduleItem: noop,
    playEnforcementProgram: noopAsync,
    playingItemOverride: null,
    schedulePlayingSlot: null,
    enterLocalMode: noop,
    enterGlobalMode: noop,
    onPlayerPause: noop,
    onPlayerSeek: noop,
    onVideoEnd: noop,
    setPlayerPlayingState: noop,
    setPlayerVisible: noop,
    ongoingCollection: null,
    upcomingCollection: null,
    pauseForPayment: noop,
    preparePlaybackForTipDrawer: noop,
    snapshotPlaybackForPaymentRedirect: noop,
    resumeAfterPayment: noop,
    applyPendingPlaybackRestore: noop,
    applyPendingAudioRestore: noop,
    unregisterTvPlayer: noop,
    reloadCurrentPlaybackAt: noop,
    scheduleSourceCommunityId: null,
    setScheduleSourceCommunityId: noop,
    scheduleError: false,
    scheduleStale: false,
    retryScheduleLoad: noop,
    selectedIndex: null,
    setSelectedIndex: noop,
  };
}

const FALLBACK_TV_CONTEXT = createFallbackTvContext();

export function useTV() {
  const ctx = useContext(TVContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[useTV] GlobalTVProvider missing — using fallback context");
    }
    return FALLBACK_TV_CONTEXT;
  }
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
  const enforcementPlaybackQueueRef = useRef<any[] | null>(null);
  const enforcementPlaybackIndexRef = useRef(0);
  const pendingEnforcementPlaybackRef = useRef<{
    item: any;
    offsetSeconds: number;
  } | null>(null);

  const paymentActiveRef = useRef(false);
  const paymentSnapshotRef = useRef<TvPaymentPlaybackSnapshot | null>(null);
  const pendingSchedulePayloadRef = useRef<any>(null);
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
    (opts?: {
      manual?: boolean;
      resetRetry?: boolean;
      trigger?: string;
    }) => Promise<void>
  >(async () => {});
  const runCoalescedScheduleLoadRef = useRef(createTvScheduleLoadCoalescer());
  const scheduleEtagRef = useRef<string | null>(null);
  const scheduleSwrBootstrappedRef = useRef(false);
  const preNavigationScheduleCacheKeysRef = useRef<Set<string>>(new Set());
  const scheduleCacheWrittenThisNavRef = useRef<Set<string>>(new Set());
  const prevScheduleSourceRef = useRef<string | null | undefined>(undefined);
  const initialScheduleLoadScheduledRef = useRef(false);
  const initialStartupInFlightRef = useRef(false);
  const initialStartupCompleteRef = useRef(false);
  const documentWasHiddenRef = useRef(
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
  const syncMissRef = useRef(0);
  const isReadyRef = useRef(false);
  const broadcastEpochRef = useRef<number | null>(null);
  const totalDurationRef = useRef(0);
  const itemsLenRef = useRef(0);
  const orchestratedPlaybackRef = useRef<{
    videoId: string;
    startSeconds: number;
  } | null>(null);
  const pendingPlaybackRequestRef = useRef<TvPlaybackRequest | null>(null);
  const pendingAudioRestoreRef = useRef<PendingAudioRestore | null>(null);
  const paymentPlaybackRestoreRef = useRef<{
    wasMuted: boolean;
    wasPlaying: boolean;
  } | null>(null);

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
    tvStartupEvent("source_reset", {
      trigger: "schedule_source_change",
      data: { communityId: hashShortId(scheduleSourceCommunityIdRef.current) },
    });
    lastSyncedIndex.current = -1;
    activeScheduleIdRef.current = null;
    syncMissRef.current = 0;
    setMode("GLOBAL");
    modeRef.current = "GLOBAL";
    setLocalModeReason(null);
    setPlayingItemOverride(null);
    setSchedulePlayingSlot(null);
    enforcementPlaybackQueueRef.current = null;
    pendingEnforcementPlaybackRef.current = null;
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
    orchestratedPlaybackRef.current = null;
    pendingPlaybackRequestRef.current = null;
    pendingAudioRestoreRef.current = null;
    scheduleSwrBootstrappedRef.current = false;
    paymentPlaybackRestoreRef.current = null;
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
    tvTrace("index", "setCurrentIndex", {
      currentIndex,
      mode: modeRef.current,
      liveBroadcastIndex: liveBroadcastIndexRef.current,
    });
    updateTvStartupContext({ currentIndex });
    tvStartupEvent("setCurrentIndex", {
      trigger: modeRef.current,
      data: { currentIndex },
    });
  }, [currentIndex]);

  useEffect(() => {
    modeRef.current = mode;
    tvTrace("navigation", "mode_change", { mode });
    updateTvStartupContext({ source: mode === "GLOBAL" ? "global" : "local" });
  }, [mode]);

  useEffect(() => {
    liveBroadcastIndexRef.current = liveBroadcastIndex;
  }, [liveBroadcastIndex]);

  useEffect(() => {
    preloadVideos(items, currentIndex);
  }, [items, currentIndex]);

  useEffect(() => {
    isReadyRef.current = isReady;
    updateTvStartupContext({ scheduleReady: isReady });
  }, [isReady]);

  useEffect(() => {
    broadcastEpochRef.current = broadcastEpoch;
  }, [broadcastEpoch]);

  useEffect(() => {
    totalDurationRef.current = totalDuration;
  }, [totalDuration]);

  useEffect(() => {
    itemsLenRef.current = items.length;
  }, [items.length]);

  const getNow = useCallback(() => Date.now() + driftRef.current, []);
  const getSyncedNow = getNow;

  const setPlayerPlayingState = useCallback((playing: boolean) => {
    isPlayingRef.current = playing;
  }, []);

  const unregisterTvPlayer = useCallback(() => {
    tvTrace("playback", "player_unregister", {});
    playerRef.current = null;
  }, []);

  const requestPlayback = useCallback((req: TvPlaybackRequest): boolean => {
    tvTrace("playback", "requestPlayback", {
      reason: req.reason,
      videoId: req.videoId,
      startSeconds: req.startSeconds,
      scheduleIndex: req.scheduleIndex,
    });

    if (isSameOrchestratedPlayback(orchestratedPlaybackRef.current, req)) {
      tvTrace("playback", "requestPlayback_skipped", {
        reason: "unchanged",
        videoId: req.videoId,
        startSeconds: req.startSeconds,
      });
      return false;
    }

    const player = playerRef.current;
    if (!player?.isReady()) {
      pendingPlaybackRequestRef.current = req;
      tvTrace("playback", "requestPlayback_deferred", {
        reason: "player_not_ready",
        videoId: req.videoId,
      });
      return false;
    }

    pendingPlaybackRequestRef.current = null;
    orchestratedPlaybackRef.current = {
      videoId: req.videoId,
      startSeconds: req.startSeconds,
    };
    tvStartupEvent("orchestrated_playback_command_issued", {
      trigger: req.reason,
      data: {
        command: "loadVideoById",
        videoIdHash: hashShortId(req.videoId),
        startOffsetSeconds: req.startSeconds,
        muted: player.isMuted?.() ?? null,
        currentIndex: currentIndexRef.current,
      },
    });
    pendingAudioRestoreRef.current = prepareMutedLoadForAutoplay(player, true);
    player.load(req.videoId, req.startSeconds);
    return true;
  }, []);

  const flushPendingPlaybackRequest = useCallback(() => {
    const pending = pendingPlaybackRequestRef.current;
    if (!pending) return;
    requestPlayback(pending);
  }, [requestPlayback]);

  const reloadCurrentPlaybackAt = useCallback(
    (startSeconds: number) => {
      const vid = orchestratedPlaybackRef.current?.videoId;
      if (!vid) return;
      orchestratedPlaybackRef.current = null;
      requestPlayback({
        reason: "error_reload",
        videoId: vid,
        startSeconds,
      });
    },
    [requestPlayback]
  );

  const syncToLive = useCallback(() => {
    tvStartupEvent("syncToLive", {
      trigger: "sync_tick",
      data: { currentIndex: currentIndexRef.current },
    });
    if (paymentActiveRef.current) {
      tvTrace("playback", "syncToLive_skipped", { reason: "payment_active" });
      return;
    }
    if (modeRef.current !== "GLOBAL") {
      tvTrace("playback", "syncToLive_skipped", {
        reason: "not_global",
        mode: modeRef.current,
      });
      return;
    }
    if (!broadcastEpoch || !items.length || !totalDuration) {
      tvTrace("playback", "syncToLive_skipped", {
        reason: "missing_schedule",
        broadcastEpoch: !!broadcastEpoch,
        itemsLen: items.length,
        totalDuration,
      });
      return;
    }

    const player = playerRef.current;
    if (!player || !player.isReady()) {
      syncMissRef.current += 1;
      tvTrace("playback", "syncToLive_player_not_ready", {
        syncMiss: syncMissRef.current,
      });
      if (syncMissRef.current > 15) {
        syncMissRef.current = 0;
        lastSyncedIndex.current = -1;
        void loadScheduleRef.current?.({ trigger: "sync_miss" });
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

    if (!pos.item) {
      tvTrace("playback", "syncToLive_no_item", {
        loopPosition: pos.loopPosition,
      });
      return;
    }

    const isNotice = pos.item.segmentKind === "notice";
    if (!isNotice && !pos.item.channel?.url) return;

    tvTrace("playback", "syncToLive", {
      mode: modeRef.current,
      currentIndex: currentIndexRef.current,
      lastSyncedIndex: lastSyncedIndex.current,
      offsetSeconds: pos.offsetSeconds,
      scheduleIndex: pos.scheduleIndex,
      segmentKind: pos.item.segmentKind,
      itemId: pos.item.id,
    });

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
        if (videoId) {
          const sameVideo =
            orchestratedPlaybackRef.current?.videoId === videoId &&
            player.isReady();
          if (sameVideo) {
            tvTrace("playback", "syncToLive_coalesced_seek", {
              videoId,
              offsetSeconds: pos.offsetSeconds,
              scheduleIndex: pos.scheduleIndex,
            });
            orchestratedPlaybackRef.current = {
              videoId,
              startSeconds: pos.offsetSeconds,
            };
            tvStartupEvent("orchestrated_playback_command_issued", {
              trigger: "syncToLive_coalesced_seek",
              data: {
                command: "seekTo",
                videoIdHash: hashShortId(videoId),
                startOffsetSeconds: pos.offsetSeconds,
                currentIndex: pos.scheduleIndex,
              },
            });
            player.seekTo(pos.offsetSeconds, false);
          } else {
            requestPlayback({
              reason: "syncToLive",
              videoId,
              startSeconds: pos.offsetSeconds,
              scheduleIndex: pos.scheduleIndex,
            });
          }
        }
      } else {
        tvTrace("playback", "syncToLive_notice_pause", {
          scheduleIndex: pos.scheduleIndex,
        });
        player.pause();
      }
    } else if (!isNotice) {
      const videoId = extractYoutubeID(pos.item.channel.url);
      const orchestrated = orchestratedPlaybackRef.current;
      if (videoId && (!orchestrated || orchestrated.videoId !== videoId)) {
        requestPlayback({
          reason: "syncToLive",
          videoId,
          startSeconds: pos.offsetSeconds,
          scheduleIndex: pos.scheduleIndex,
        });
      } else {
        const actual = player.getCurrentTime();
        if (Math.abs(actual - pos.offsetSeconds) > DRIFT_THRESHOLD_S) {
          tvTrace("playback", "syncToLive_drift_seek", {
            actual,
            target: pos.offsetSeconds,
          });
          orchestratedPlaybackRef.current = orchestratedPlaybackRef.current
            ? {
                ...orchestratedPlaybackRef.current,
                startSeconds: pos.offsetSeconds,
              }
            : null;
          tvStartupEvent("orchestrated_playback_command_issued", {
            trigger: "syncToLive_drift_seek",
            data: {
              command: "seekTo",
              startOffsetSeconds: pos.offsetSeconds,
              currentIndex: pos.scheduleIndex,
            },
          });
          player.seekTo(pos.offsetSeconds, false);
        }
      }
    }
  }, [broadcastEpoch, items, totalDuration, getNow, requestPlayback]);

  const maybeSyncToLive = useCallback(
    (source: string) => {
      if (modeRef.current !== "GLOBAL") return;
      if (
        !isReadyRef.current ||
        itemsLenRef.current < 1 ||
        broadcastEpochRef.current == null ||
        totalDurationRef.current <= 0
      ) {
        tvTrace("playback", "syncToLive_deferred", {
          source,
          isReady: isReadyRef.current,
          itemsLen: itemsLenRef.current,
          broadcastEpoch: broadcastEpochRef.current != null,
          totalDuration: totalDurationRef.current,
        });
        return;
      }
      syncToLive();
    },
    [syncToLive]
  );

  const selectedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  const setPlayerVisible = useCallback(
    (visible: boolean) => {
      tvTrace("navigation", "setPlayerVisible", {
        visible,
        mode: modeRef.current,
      });
      if (visible && modeRef.current === "GLOBAL") {
        queueMicrotask(() => {
          flushPendingPlaybackRequest();
          maybeSyncToLive("setPlayerVisible");
        });
      } else if (visible) {
        flushPendingPlaybackRequest();
      }
      if (!visible) {
        paymentPlaybackRestoreRef.current = null;
      }
    },
    [maybeSyncToLive, flushPendingPlaybackRequest]
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
      orchestratedPlaybackRef.current = null;
      pendingPlaybackRequestRef.current = null;
    }

    setItems(data.items ?? []);
    tvStartupEvent("playlist_selected", {
      canonicalMark: "T5",
      reason: data.scheduleFallback
        ? "fallback"
        : data.scheduleState === "NO_SAFE_CONTENT"
          ? "notice"
          : "ongoing",
      data: {
        scheduleState: data.scheduleState ?? null,
        ongoingCount: Array.isArray(data.items) ? data.items.length : 0,
        alternateCount: Array.isArray(data.alternateBatchItems)
          ? data.alternateBatchItems.length
          : 0,
        scheduleRevision: data.scheduleRevisions?.ongoing ?? null,
      },
    });
    schedulePostTtfvIdle(() => {
      prefetchTvEventCatalogs(
        collectTvScheduleEventIds((data.items as any[]) ?? [], 24)
      );
    });
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
      if (modeRef.current === "GLOBAL" && !paymentActiveRef.current) {
        setCurrentIndex(live.scheduleIndex);
        currentIndexRef.current = live.scheduleIndex;
        lastSyncedIndex.current = live.scheduleIndex;
        tvTrace("schedule", "cold_start_seeded_index", {
          scheduleIndex: live.scheduleIndex,
          offsetSeconds: live.offsetSeconds,
        });
      }
      tvTrace("schedule", "livePosition_resolved", {
        scheduleIndex: live.scheduleIndex,
        offsetSeconds: live.offsetSeconds,
        loopPosition: live.loopPosition ?? 0,
        currentIndex: currentIndexRef.current,
      });
      const liveItem = (data.items as any[])?.[live.scheduleIndex];
      tvStartupEvent("initial_playback_position_resolved", {
        canonicalMark: "T6",
        reason:
          modeRef.current === "GLOBAL" && !paymentActiveRef.current
            ? "cold_start_seeded_index"
            : "live_position_only",
        data: {
          selectedIndex: live.scheduleIndex,
          liveOffsetSeconds: live.offsetSeconds,
          totalDuration: live.totalDuration ?? data.totalDuration ?? 0,
          videoIdHash: hashShortId(
            liveItem?.channel?.url
              ? extractYoutubeID(liveItem.channel.url)
              : null
          ),
        },
      });
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

  const applyPendingAudioRestore = useCallback(() => {
    const player = playerRef.current;
    const pending = pendingAudioRestoreRef.current;
    if (!player?.isReady() || !pending) return;
    pendingAudioRestoreRef.current = applyPendingAudioRestoreHelper(
      player,
      pending,
      "TvProvider.applyPendingAudioRestore"
    );
  }, []);

  const applyPendingPlaybackRestore = useCallback(() => {
    const p = paymentPlaybackRestoreRef.current;
    if (!p) return;
    paymentPlaybackRestoreRef.current = null;
    const pl = playerRef.current;
    if (!pl?.isReady()) return;
    pendingAudioRestoreRef.current = applyPaymentPlaybackRestore(
      pl,
      p,
      "TvProvider.applyPendingPlaybackRestore"
    );
  }, []);

  const loadSchedule = useCallback(
    async (opts?: {
      manual?: boolean;
      resetRetry?: boolean;
      trigger?: string;
    }) => {
      const coalesceKey = scheduleSourceCommunityIdRef.current;
      return runCoalescedScheduleLoadRef.current(coalesceKey, async () => {
        tvTrace("schedule", "loadSchedule_start", {
          manual: opts?.manual ?? false,
          resetRetry: opts?.resetRetry ?? false,
          communityId: scheduleSourceCommunityIdRef.current,
          mode: modeRef.current,
        });
        const startupTrigger = opts?.trigger ?? "initial";
        if (opts?.resetRetry) {
          scheduleRetryCountRef.current = 0;
          if (scheduleRetryTimeoutRef.current) {
            clearTimeout(scheduleRetryTimeoutRef.current);
            scheduleRetryTimeoutRef.current = null;
          }
          if (isTvScheduleSwrEnabled() && !scheduleSwrBootstrappedRef.current) {
            const cid = scheduleSourceCommunityIdRef.current;
            const cacheKey = tvScheduleStorageKey(cid);
            const cached = readTvScheduleCache(cid);
            const bootstrapDecision = resolveSessionCacheBootstrap({
              singleStartupEnabled: isTvSingleStartupScheduleEnabled(),
              swrEnabled: true,
              swrBootstrapped: scheduleSwrBootstrappedRef.current,
              cacheKey,
              hasValidCache: !!cached,
              preNavigationCacheKeys: preNavigationScheduleCacheKeysRef.current,
              cacheWrittenThisNavigation:
                scheduleCacheWrittenThisNavRef.current,
            });
            if (bootstrapDecision.markSwrBootstrapped) {
              scheduleSwrBootstrappedRef.current = true;
            }
            if (bootstrapDecision.shouldBootstrap && cached) {
              scheduleEtagRef.current = cached.etag ?? scheduleEtagRef.current;
              applySchedulePayload(cached.body);
              setScheduleStale(true);
              setScheduleError(false);
              setIsReady(true);
              tvLoadMark("T3_cache_hit", { communityId: cid });
              tvLoadMark("T4", { source: "schedule_swr_cache" });
              tvStartupEvent("session_cache_bootstrap", {
                trigger: startupTrigger,
                data: { communityId: hashShortId(cid) },
              });
              tvStartupEvent("schedule_payload_accepted", {
                canonicalMark: "T4",
                trigger: startupTrigger,
                data: {
                  source: "session_cache",
                  scheduleState: (cached.body as any)?.scheduleState ?? null,
                  ongoingCount: Array.isArray((cached.body as any)?.items)
                    ? (cached.body as any).items.length
                    : 0,
                  alternateCount: Array.isArray(
                    (cached.body as any)?.alternateBatchItems
                  )
                    ? (cached.body as any).alternateBatchItems.length
                    : 0,
                  scheduleRevision:
                    (cached.body as any)?.scheduleRevisions?.ongoing ?? null,
                  activeScheduleIdHash: hashShortId(
                    (cached.body as any)?.activeScheduleId ?? null
                  ),
                },
              });
              logTV("schedule_swr_bootstrap", {
                mode: modeRef.current,
                currentIndex: currentIndexRef.current,
                offsetSeconds: null,
              });
              if (modeRef.current === "GLOBAL") {
                queueMicrotask(() => syncToLive());
              }
            }
          }
        }

        tvLoadMark("T3_cache_miss", {
          manual: opts?.manual ?? false,
          communityId: scheduleSourceCommunityIdRef.current,
        });

        const applySuccess = (
          data: any,
          etag: string | null,
          fetchCommunityId: string | null
        ) => {
          if (
            isScheduleResponseStale(
              fetchCommunityId,
              scheduleSourceCommunityIdRef.current
            )
          ) {
            void loadScheduleRef.current?.({ resetRetry: true });
            return;
          }
          const cid = scheduleSourceCommunityIdRef.current;
          if (etag) scheduleEtagRef.current = etag;
          persistTvScheduleCache(data, etag, cid, writtenKey => {
            scheduleCacheWrittenThisNavRef.current.add(writtenKey);
          });
          tvStartupEvent("schedule_payload_accepted", {
            canonicalMark: "T4",
            trigger: "network",
            data: {
              source: "network",
              scheduleState: (data as any)?.scheduleState ?? null,
              ongoingCount: Array.isArray((data as any)?.items)
                ? (data as any).items.length
                : 0,
              alternateCount: Array.isArray((data as any)?.alternateBatchItems)
                ? (data as any).alternateBatchItems.length
                : 0,
              scheduleRevision:
                (data as any)?.scheduleRevisions?.ongoing ?? null,
              activeScheduleIdHash: hashShortId(
                (data as any)?.activeScheduleId ?? null
              ),
            },
          });
          applySchedulePayload(data);
          setScheduleError(false);
          setScheduleStale(false);
          setIsReady(true);
          tvLoadMark("T4", { source: "loadSchedule_success" });
          tvTrace("schedule", "loadSchedule_network_success", {
            itemsLen: ((data as { items?: unknown[] }).items ?? []).length,
          });
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
              void loadScheduleRef.current({ trigger: "boundary" });
            }, ms + TV_BOUNDARY_REFETCH_SLACK_MS);
          }
        };

        let fetchCommunityId = scheduleSourceCommunityIdRef.current;
        const requestStartedAt =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const usingDirectFetch = isTvDirectScheduleFetchEnabled();
        const scheduleAttemptId = createScheduleAttemptId();
        const attemptNumber = nextScheduleAttemptNumber();
        tvStartupEvent("schedule_request_started", {
          trigger: startupTrigger,
          data: {
            scheduleAttemptId,
            attemptNumber,
            scheduleSource: fetchCommunityId ? "community" : "global",
            communityIdHash: hashShortId(fetchCommunityId),
            fetchMode: usingDirectFetch ? "direct_fetch" : "server_action",
            attempt: scheduleRetryCountRef.current,
            hasEtag: !!scheduleEtagRef.current,
          },
        });
        const finishedElapsed = () =>
          (typeof performance !== "undefined"
            ? performance.now()
            : Date.now()) - requestStartedAt;
        try {
          fetchCommunityId = scheduleSourceCommunityIdRef.current;
          const scheduleOpts = {
            communityId: fetchCommunityId,
            ifNoneMatch: scheduleEtagRef.current,
            startupTraceId: getTvStartupTraceId(),
            scheduleAttemptId,
          };
          const res = usingDirectFetch
            ? await fetchTvScheduleClient(scheduleOpts)
            : await fetchTvScheduleAction(scheduleOpts);

          if (res.success && res.data?.notModified) {
            if (
              isScheduleResponseStale(
                fetchCommunityId,
                scheduleSourceCommunityIdRef.current
              )
            ) {
              tvStartupEvent("stale_schedule_response", {
                trigger: startupTrigger,
                reason: "not_modified_stale_source",
              });
              void loadScheduleRef.current?.({ resetRetry: true });
              return;
            }
            tvStartupEvent("schedule_request_finished", {
              trigger: startupTrigger,
              reason: "not_modified",
              data: {
                scheduleAttemptId,
                attemptNumber,
                outcome: "304",
                status: res.data.status ?? 304,
                elapsedRequestMs: Math.round(finishedElapsed()),
                fromCache: false,
              },
            });
            tvTrace("schedule", "loadSchedule_not_modified", {
              mode: modeRef.current,
            });
            logTV("schedule_not_modified", {
              mode: modeRef.current,
              currentIndex: currentIndexRef.current,
              offsetSeconds: null,
            });
            return;
          }

          if (!res.success || !res.data?.body) {
            const failMsg =
              !res.success && "error" in res && res.error
                ? res.error
                : "message" in res &&
                    typeof (res as { message?: string }).message === "string"
                  ? (res as { message: string }).message
                  : "Failed to load TV schedule";
            throw new Error(failMsg);
          }

          const data = res.data.body;
          const etag = res.data.etag ?? null;

          tvStartupEvent("schedule_request_finished", {
            trigger: startupTrigger,
            reason: "success",
            data: {
              scheduleAttemptId,
              attemptNumber,
              outcome: "success",
              status: res.data.status ?? 200,
              elapsedRequestMs: Math.round(finishedElapsed()),
              fromCache: false,
            },
          });

          logTV("schedule_loaded", {
            mode: modeRef.current,
            currentIndex: currentIndexRef.current,
            offsetSeconds: null,
            status: res.data.status,
            checksum: (data as { checksum?: string }).checksum,
            activeScheduleId: (data as { activeScheduleId?: string })
              .activeScheduleId,
          });
          tvTrace("schedule", "loadSchedule_success", {
            itemsLen: ((data as { items?: unknown[] }).items ?? []).length,
            liveScheduleIndex: (
              data as { livePosition?: { scheduleIndex?: number } }
            ).livePosition?.scheduleIndex,
            activeScheduleId: (data as { activeScheduleId?: string })
              .activeScheduleId,
          });

          applySuccess(data, etag, fetchCommunityId);
          if (modeRef.current === "GLOBAL") {
            queueMicrotask(() => syncToLive());
          }
        } catch (err) {
          console.error("Failed to load TV schedule:", err);
          tvTrace("schedule", "loadSchedule_failure", {
            error: err instanceof Error ? err.message : String(err),
          });
          if (
            isScheduleResponseStale(
              fetchCommunityId,
              scheduleSourceCommunityIdRef.current
            )
          ) {
            tvStartupEvent("stale_schedule_response", {
              trigger: startupTrigger,
              reason: "failure_stale_source",
            });
            void loadScheduleRef.current?.({ resetRetry: true });
            return;
          }
          const cid = scheduleSourceCommunityIdRef.current;
          const cached = readTvScheduleCache(cid);
          const attemptForDelay = scheduleRetryCountRef.current;
          const willRetry = attemptForDelay < MAX_SCHEDULE_RETRIES;
          const selectedRetryDelay = willRetry
            ? RETRY_DELAYS_MS[
                Math.min(attemptForDelay, RETRY_DELAYS_MS.length - 1)
              ]
            : null;
          tvStartupEvent("schedule_request_finished", {
            trigger: startupTrigger,
            reason: "failure",
            data: {
              scheduleAttemptId,
              attemptNumber,
              outcome: "failure",
              elapsedRequestMs: Math.round(finishedElapsed()),
              fromCache: !!cached,
              error: err instanceof Error ? err.message : String(err),
              willRetry,
              retryDelayMs: selectedRetryDelay,
              scheduleReadyRemainedFalse: !cached,
              playerMountPrevented: !cached,
            },
          });
          if (cached) {
            scheduleEtagRef.current = cached.etag ?? scheduleEtagRef.current;
            tvStartupEvent("schedule_payload_accepted", {
              canonicalMark: "T4",
              trigger: "fallback_cache",
              data: {
                source: "fallback_cache",
                scheduleState: (cached.body as any)?.scheduleState ?? null,
                ongoingCount: Array.isArray((cached.body as any)?.items)
                  ? (cached.body as any).items.length
                  : 0,
              },
            });
            applySchedulePayload(cached.body);
            setScheduleStale(true);
            setScheduleError(false);
            setIsReady(true);
            tvLoadMark("T4", { source: "schedule_fallback_cache" });
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
                void loadScheduleRef.current({ trigger: "boundary" });
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
            const scheduledAtMs =
              typeof performance !== "undefined"
                ? performance.now()
                : Date.now();
            tvStartupEvent("retry_scheduled", {
              trigger: startupTrigger,
              data: {
                attempt,
                retryDelayMs: delay,
                failureAtMs: Math.round(scheduledAtMs),
                scheduleReadyRemainedFalse: !isReadyRef.current,
              },
            });
            scheduleRetryTimeoutRef.current = setTimeout(() => {
              scheduleRetryCountRef.current += 1;
              tvStartupEvent("retry_executed", {
                trigger: "retry",
                data: {
                  attempt: scheduleRetryCountRef.current,
                  retryDelayMs: delay,
                },
              });
              void loadSchedule({ trigger: "retry" });
            }, delay);
          }
        } finally {
          if (
            isTvSingleStartupScheduleEnabled() &&
            startupTrigger === "initial"
          ) {
            initialStartupInFlightRef.current = false;
            initialStartupCompleteRef.current = true;
          }
        }
      });
    },
    [applySchedulePayload, syncToLive]
  );

  useEffect(() => {
    loadScheduleRef.current = loadSchedule;
  }, [loadSchedule]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScheduleUpdated = () => {
      tvStartupEvent("pusher_schedule_refresh", { trigger: "pusher" });
      scheduleEtagRef.current = null;
      void loadScheduleRef.current?.({ manual: true, trigger: "pusher" });
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
    if (isTvSingleStartupScheduleEnabled()) {
      const decision = resolveScheduleSourceChange(
        prevScheduleSourceRef.current,
        scheduleSourceCommunityId
      );
      prevScheduleSourceRef.current = scheduleSourceCommunityId;
      if (decision.action === "skip") return;
      scheduleEtagRef.current = null;
      tvTrace("schedule", "schedule_source_change", {
        communityId: scheduleSourceCommunityId,
        reason: decision.reason,
      });
      resetPlaybackForScheduleSourceChange();
      void loadScheduleRef.current?.({
        resetRetry: true,
        trigger: "source_change",
      });
      return;
    }

    scheduleEtagRef.current = null;
    tvTrace("schedule", "schedule_source_change", {
      communityId: scheduleSourceCommunityId,
    });
    resetPlaybackForScheduleSourceChange();
    void loadScheduleRef.current?.({
      resetRetry: true,
      trigger: "source_change",
    });
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
    tvLoadMark("T2", { source: "TVProvider_mount" });
    markTvStartupNavigation();
    if (isTvSingleStartupScheduleEnabled()) {
      preNavigationScheduleCacheKeysRef.current =
        snapshotPreNavigationScheduleCacheKeys();
      scheduleCacheWrittenThisNavRef.current = new Set();
    }
    updateTvStartupContext({
      source: scheduleSourceCommunityIdRef.current ? "community" : "global",
      scheduleReady: false,
      playerReady: false,
      overlayVisible: true,
    });
    tvStartupEvent("tv_provider_mounted", {
      canonicalMark: "T2",
      trigger: "provider_mount",
    });
  }, []);

  useEffect(() => {
    initTvAnalyticsRuntime();
    return () => shutdownTvAnalyticsRuntime();
  }, []);

  useEffect(() => {
    if (!isTvSingleStartupScheduleEnabled()) return;
    if (initialScheduleLoadScheduledRef.current) return;
    initialScheduleLoadScheduledRef.current = true;
    initialStartupInFlightRef.current = true;
    void loadScheduleRef.current?.({ resetRetry: true, trigger: "initial" });
    return () => {
      if (scheduleRetryTimeoutRef.current) {
        clearTimeout(scheduleRetryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTvSingleStartupScheduleEnabled()) return;
    void loadSchedule({ resetRetry: true, trigger: "initial" });
    return () => {
      if (scheduleRetryTimeoutRef.current) {
        clearTimeout(scheduleRetryTimeoutRef.current);
      }
    };
  }, [loadSchedule]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadSchedule({ trigger: "interval" });
    }, SCHEDULE_REFETCH_MS);
    return () => clearInterval(id);
  }, [loadSchedule]);

  useEffect(() => {
    const onVis = () => {
      tvTrace("navigation", "visibilitychange", {
        state: document.visibilityState,
      });
      if (document.visibilityState === "hidden") {
        documentWasHiddenRef.current = true;
      }
      if (document.visibilityState === "visible") {
        if (
          shouldSuppressVisibilityScheduleRefresh({
            singleStartupEnabled: isTvSingleStartupScheduleEnabled(),
            visibilityState: document.visibilityState,
            documentWasHidden: documentWasHiddenRef.current,
            initialStartupInFlight: initialStartupInFlightRef.current,
            initialStartupComplete: initialStartupCompleteRef.current,
          })
        ) {
          tvTrace("navigation", "visibilitychange_suppressed", {
            reason: "startup_guard",
          });
          return;
        }
        tvStartupEvent("visibility_schedule_refresh", {
          trigger: "visibility",
        });
        void loadSchedule({ trigger: "visibility" });
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
    enforcementPlaybackQueueRef.current = null;
    pendingEnforcementPlaybackRef.current = null;
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
      opts: {
        source: "preview" | "schedule";
        updatePreviewPin: boolean;
        userGesture?: boolean;
      }
    ) => {
      tvTrace("playback", "loadLocalAtIndex", { index, source: opts.source });
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

      const videoId = extractYoutubeID(item.channel.url);
      if (videoId) {
        requestPlayback({
          reason: "loadLocal",
          videoId,
          startSeconds: 0,
          scheduleIndex: index,
        });
        if (opts.userGesture) {
          const player = playerRef.current;
          if (player?.isReady()) {
            playWithUserGesture(
              player,
              pendingAudioRestoreRef.current,
              "loadLocalAtIndex"
            );
            pendingAudioRestoreRef.current = null;
          }
        }
      }
    },
    [items, enterLocalMode, requestPlayback]
  );

  const playLocal = useCallback(
    (
      index: number,
      opts?: {
        userGesture?: boolean;
        updatePreviewPin?: boolean;
        trackClick?: boolean;
      }
    ) => {
      if (opts?.trackClick !== false) {
        trackTvUserInteraction("click", "playlist");
      }
      setSelectedIndex(index);
      loadLocalAtIndex(index, {
        source: "preview",
        updatePreviewPin: opts?.updatePreviewPin ?? true,
        userGesture: opts?.userGesture ?? true,
      });
    },
    [loadLocalAtIndex]
  );

  const playLocalFromSchedule = useCallback(
    (index: number) => {
      trackTvUserInteraction("click", "schedule_row");

      setSelectedIndex(index);
      setPreviewPinIndex(index);

      loadLocalAtIndex(index, {
        source: "schedule",
        updatePreviewPin: false,
        userGesture: true,
      });
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
      const videoId = extractYoutubeID(item.channel.url);
      if (videoId) {
        requestPlayback({
          reason: "loadLocal",
          videoId,
          startSeconds: 0,
        });
        const player = playerRef.current;
        if (player?.isReady()) {
          playWithUserGesture(
            player,
            pendingAudioRestoreRef.current,
            "playLocalScheduleItem"
          );
          pendingAudioRestoreRef.current = null;
        }
      }
    },
    [
      items,
      alternateBatchItems,
      enterLocalMode,
      playLocalFromSchedule,
      requestPlayback,
    ]
  );

  const loadEnforcementPlayerItem = useCallback(
    (item: any, offsetSeconds = 0) => {
      if (!item?.channel?.url) return false;
      const player = playerRef.current;
      if (!player || !player.isReady()) {
        pendingEnforcementPlaybackRef.current = { item, offsetSeconds };
        return false;
      }
      pendingEnforcementPlaybackRef.current = null;
      const videoId = extractYoutubeID(item.channel.url);
      if (!videoId) return false;
      return requestPlayback({
        reason: "enforcement",
        videoId,
        startSeconds: offsetSeconds,
      });
    },
    [requestPlayback]
  );

  const playEnforcementProgram = useCallback(
    async (enforcementId: string, communityId?: string | null) => {
      const enfId = enforcementId.trim();
      if (!enfId) return;

      enforcementPlaybackQueueRef.current = null;

      if (
        modeRef.current === "GLOBAL" &&
        broadcastEpoch &&
        items.length &&
        totalDuration
      ) {
        const pos = resolveBroadcastPosition(
          items,
          broadcastEpoch,
          totalDuration,
          getNow()
        );
        const liveItem = pos.item;
        if (isEnforcementScheduleItem(liveItem, enfId)) {
          setPlayingItemOverride(null);
          setSchedulePlayingSlot({
            scope: "active",
            rowIndex: pos.scheduleIndex,
            source: "schedule",
          });
          enterLocalMode("enforcement_live", pos.scheduleIndex);
          loadEnforcementPlayerItem(liveItem, pos.offsetSeconds);
          return;
        }
      }

      const scheduleIdx = items.findIndex((i: ScheduleItem) =>
        isEnforcementScheduleItem(i, enfId)
      );
      if (scheduleIdx >= 0) {
        playLocalFromSchedule(scheduleIdx);
        return;
      }

      const program = communityId?.trim()
        ? await fetchCommunityProgramBootstrap(communityId.trim(), enfId)
        : await fetchGlobalProgramBootstrap(enfId);
      if (!program?.items?.length) return;

      const queue = program.items
        .filter(item => item.contentUrl)
        .map((item, position) => ({
          id: `enf-bootstrap:${item.id}`,
          duration: item.durationSec,
          position,
          segmentKind: "enforcement" as const,
          enforcementId: program.id,
          blockTitle: program.title,
          channel: {
            id: item.channelId,
            url: item.contentUrl!,
            title: item.title,
            hostName: "",
            username: "",
            numOfTips: 0,
            eventType: "video",
            eventId: item.eventId,
            organizationName: null,
          },
          defaultChannelEventId: item.eventId,
        }));
      if (!queue.length) return;

      enforcementPlaybackQueueRef.current = queue;
      enforcementPlaybackIndexRef.current = 0;
      setPlayingItemOverride(queue[0]);
      setSchedulePlayingSlot({ scope: "alternate", rowIndex: 0 });
      const anchor = liveBroadcastIndexRef.current;
      enterLocalMode("enforcement_deep_link", anchor);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_LOCAL_INDEX_KEY, String(anchor));
      }
      loadEnforcementPlayerItem(queue[0], 0);
    },
    [
      broadcastEpoch,
      items,
      totalDuration,
      getNow,
      playLocalFromSchedule,
      enterLocalMode,
      loadEnforcementPlayerItem,
    ]
  );

  const onVideoEnd = useCallback(() => {
    tvTrace("playback", "onVideoEnd", {
      mode: modeRef.current,
      currentIndex: currentIndexRef.current,
    });
    if (paymentActiveRef.current) return;

    const queue = enforcementPlaybackQueueRef.current;
    if (queue && modeRef.current !== "GLOBAL") {
      const nextIdx = enforcementPlaybackIndexRef.current + 1;
      if (nextIdx < queue.length) {
        enforcementPlaybackIndexRef.current = nextIdx;
        const item = queue[nextIdx];
        setPlayingItemOverride(item);
        setSchedulePlayingSlot({ scope: "alternate", rowIndex: nextIdx });
        loadEnforcementPlayerItem(item, 0);
        return;
      }
      enforcementPlaybackQueueRef.current = null;
    }

    if (modeRef.current !== "GLOBAL") {
      const len = items.length;
      if (len < 1) return;
      if (len < 2) {
        playLocal(0, {
          userGesture: false,
          updatePreviewPin: false,
          trackClick: false,
        });
        return;
      }
      playLocal((currentIndexRef.current + 1) % len, {
        userGesture: false,
        updatePreviewPin: false,
        trackClick: false,
      });
      return;
    }

    syncToLive();
  }, [items.length, playLocal, syncToLive, loadEnforcementPlayerItem]);

  useEffect(() => {
    const pending = pendingEnforcementPlaybackRef.current;
    if (!pending) return;
    loadEnforcementPlayerItem(pending.item, pending.offsetSeconds);
  }, [isReady, playingItemOverride, loadEnforcementPlayerItem]);

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
      paymentPlaybackRestoreRef.current = {
        wasMuted: snap.wasMuted,
        wasPlaying: snap.wasPlaying,
      };
      paymentActiveRef.current = false;
      setIsPaymentActive(false);
      syncToLive();
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
    paymentPlaybackRestoreRef.current = {
      wasMuted: snap.wasMuted,
      wasPlaying: snap.wasPlaying,
    };
    applyPendingPlaybackRestore();
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
      tvTrace("navigation", "tv_page_open", { mode: modeRef.current });
      lastSyncedIndex.current = -1;
      if (modeRef.current === "GLOBAL") {
        queueMicrotask(() => maybeSyncToLive("tv_page_open"));
      }
    };

    window.addEventListener("tv-page-open", handler);
    return () => window.removeEventListener("tv-page-open", handler);
  }, [maybeSyncToLive]);

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
      paymentPlaybackRestoreRef.current = {
        wasMuted: persisted.wasMuted,
        wasPlaying: persisted.wasPlaying,
      };
      queueMicrotask(() => {
        syncToLive();
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
      paymentPlaybackRestoreRef.current = {
        wasMuted: persisted.wasMuted,
        wasPlaying: persisted.wasPlaying,
      };
      applyPendingPlaybackRestore();
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
        playEnforcementProgram,
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
        applyPendingAudioRestore,
        unregisterTvPlayer,
        reloadCurrentPlaybackAt,

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
