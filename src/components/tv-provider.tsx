"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  releaseStartupStabilityGuardOnce,
  setTvStartupStabilityGuardReleaseCallback,
  tvStartupFinalizeFailed,
} from "@/lib/tv-startup-trace";
import { requestTvYoutubeApiWarmup } from "@/lib/tv-youtube-api-warmup";
import {
  isSameOrchestratedPlayback,
  isUserIntentPlaybackReason,
  resolveUnchangedPlaybackAction,
  type TvPlaybackRequest,
} from "@/lib/tv-playback-request";
import {
  resolveEnforcementPlaybackMode,
  skipNoticeSegments,
} from "@/lib/tv/enforcement-playback-mode";
import {
  resolveLivePreNoticeFromAxis,
  type LivePreNotice,
} from "@/lib/tv/resolve-live-pre-notice-from-axis";
import {
  applyPaymentPlaybackRestore,
  applyPendingAudioRestore as applyPendingAudioRestoreHelper,
  playAlreadyLoadedWithGesture,
  playWithUserGesture,
  prepareMutedLoadForAutoplay,
  readTvMutePref,
  type PendingAudioRestore,
} from "@/lib/tv-autoplay";
import { shouldRemountTvPlayer } from "@/lib/tv-player-resume";
import { readTvPlaybackSnapshot } from "@/lib/tv-playback-session";
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
  isTvInitialLiveOffsetEmbedEnabled,
  isTvStartupPlaybackGuardEnabled,
  isTvStartupStabilityGuardActive,
} from "@/lib/tv-feature-flags";
import {
  buildProvisionalInitialTarget,
  canRecordInitialEmbedSuccess,
  evaluateInitialEmbedSuccess,
  isInitialTargetStillValid,
  isStaleStartupGeneration,
  isSyncBasedInitialEmbedSuccessTrigger,
  shouldSkipInitialReload,
  type CommittedInitialEmbed,
  type InitialEmbedSuccessTrigger,
  type InitialTvPlaybackTarget,
} from "@/lib/tv-initial-live-offset-embed";
import {
  classifyStartupPlayerError,
  classifyYoutubeErrorKind,
  createStartupPlaybackGuardState,
  evaluatePreStableDriftSeek,
  findNextEligibleScheduleIndex,
  getStartupErrorLifecyclePhase,
  isStartupStabilityContainmentActive,
  markInitialCommandIssued,
  markPreStableCorrectiveSeekIssued,
  markStartupAwaitingStablePlayback,
  markStartupFirstPlay,
  markStartupStablePlayback,
  markStartupTerminalFailure,
  MAX_STARTUP_PLAYER_RECOVERIES,
  resetPreStableCorrectiveSeekAllowance,
  resetStartupPlaybackGuardState,
  resolvePositionSkippingFailedTargets,
  shouldBlockStartupOrchestrationCommands,
  shouldSuppressDuplicatePrePlayLoad,
  shouldSuppressPrePlayDriftSeek,
  type StartupPlaybackGuardState,
} from "@/lib/tv-startup-playback-guard";
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

export type LastLivePosition = Pick<
  BroadcastPosition,
  "scheduleIndex" | "offsetSeconds" | "loopPosition" | "totalDuration"
>;

export type TvPaymentPlaybackSnapshot = {
  mode: "GLOBAL" | "LOCAL";
  /** Mode before the tip drawer opened (for post-payment live axis). */
  originMode: "GLOBAL" | "LOCAL";
  currentIndex: number;
  currentTime: number;
  wasPlaying: boolean;
  wasMuted: boolean;
  playingItemOverrideId: string | null;
  schedulePlayingSlot: SchedulePlayingSlot | null;
  localModeReason: string | null;
};

export type LocalPreNoticeSnapshot = {
  enforcementId: string;
  index: number;
  seekSeconds: number;
  wasPlaying: boolean;
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

  /** Live schedule index from resolver; kept current in both GLOBAL and LOCAL for UI anchoring. */
  liveBroadcastIndex: number;

  /** Axis-derived pre-notice metadata (both modes); null when off-axis or post-notice. */
  livePreNotice: LivePreNotice | null;
  /** LOCAL snapshot taken when pre-notice slate first appears. */
  localPreNoticeSnapshot: LocalPreNoticeSnapshot | null;
  dismissPreNotice: (enforcementId: string) => void;
  restorePreNoticeLocal: () => void;
  isPreNoticeDismissed: (enforcementId: string) => boolean;

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

  /** Flushes a playback request that was deferred until the TV player became ready. */
  flushPendingPlaybackRequest: () => void;

  /** Restores tab-scoped playback snapshot after same-tab route leave/return. */
  applyTabPlaybackSnapshotRestore: (trigger: string) => void;

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

  /** Phase C0 — YouTube onError (numeric code) from TvLooper. */
  handleStartupPlayerError: (youtubeErrorCode: number) => void;
  /** Phase C0 — first successful PLAYING notification from looper. */
  notifyStartupPlayerPlaying: () => void;

  /** Phase C1 — provisional target for initial live-offset embed (read-only). */
  initialPlaybackTarget: InitialTvPlaybackTarget | null;
  /** Phase C1 — stable generation for visibility remount reconstruct only. */
  startupEmbedGeneration: number;

  /** Phase C1 — TvPlayer reports committed iframe target at mount. */
  onInitialLiveOffsetEmbedCommitted: (payload: {
    videoId: string;
    startOffsetSeconds: number;
    selectedIndex: number;
    startupGeneration: number;
  }) => void;
  /** Phase C1 — confirm embed target at onReady (T9). */
  onInitialLiveOffsetEmbedConfirmed: (payload: {
    startupGeneration: number;
  }) => void;

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
    livePreNotice: null,
    localPreNoticeSnapshot: null,
    dismissPreNotice: noop,
    restorePreNoticeLocal: noop,
    isPreNoticeDismissed: () => false,
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
    flushPendingPlaybackRequest: noop,
    applyTabPlaybackSnapshotRestore: noop,
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
    handleStartupPlayerError: noop,
    notifyStartupPlayerPlaying: noop,
    initialPlaybackTarget: null,
    startupEmbedGeneration: 1,
    onInitialLiveOffsetEmbedCommitted: noop,
    onInitialLiveOffsetEmbedConfirmed: noop,
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
  const [livePreNotice, setLivePreNotice] = useState<LivePreNotice | null>(
    null
  );
  const [localPreNoticeSnapshot, setLocalPreNoticeSnapshot] =
    useState<LocalPreNoticeSnapshot | null>(null);
  const [dismissedPreNoticeIds, setDismissedPreNoticeIds] = useState<string[]>(
    []
  );
  const dismissedPreNoticeIdsRef = useRef<Set<string>>(new Set());
  const prevLivePreNoticeEnfIdRef = useRef<string | null>(null);
  const localPreNoticeSnapshottedEnfRef = useRef<string | null>(null);
  const livePreNoticeRef = useRef<LivePreNotice | null>(null);
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
  const postPaymentAxisRef = useRef(false);
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
  const remountedThisHideShowCycleRef = useRef(false);
  const startupPlaybackGuardRef = useRef<StartupPlaybackGuardState>(
    createStartupPlaybackGuardState()
  );
  const inFlightOrchestratedVideoIdRef = useRef<string | null>(null);
  const legacyVideoErrorReloadsRef = useRef(0);
  const lastOrchestratedCommandRef = useRef<string | null>(null);
  const initialEmbedGen = 1;
  const startupGenerationRef = useRef(initialEmbedGen);
  const provisionalInitialTargetRef = useRef<InitialTvPlaybackTarget | null>(
    null
  );
  const committedInitialEmbedRef = useRef<CommittedInitialEmbed | null>(null);
  const initialEmbedSuccessRecordedGenerationRef = useRef<number | null>(null);
  const prePlayReplacementLoadIssuedRef = useRef(false);
  const prePlayExecutedSeekIssuedRef = useRef(false);
  const initialEmbedMarkedStaleRef = useRef(false);
  const lastEmbedSuccessRejectionReasonRef = useRef<string | null>(null);
  const preStableSeekSuppressedCountRef = useRef(0);
  const preStableCorrectiveSeekCountRef = useRef(0);
  const syncMissRef = useRef(0);
  const isReadyRef = useRef(false);
  const playbackTabSnapshotRestoreAppliedRef = useRef(false);
  const pendingTabSnapshotSeekRef = useRef<number | null>(null);
  const applyTabPlaybackSnapshotRestoreRef = useRef<(trigger: string) => void>(
    () => {}
  );
  const broadcastEpochRef = useRef<number | null>(null);
  const totalDurationRef = useRef(0);
  const itemsLenRef = useRef(0);
  const orchestratedPlaybackRef = useRef<{
    videoId: string;
    startSeconds: number;
  } | null>(null);
  const pendingPlaybackRequestRef = useRef<TvPlaybackRequest | null>(null);
  const pendingUserGesturePlayRef = useRef(false);
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
  const [initialPlaybackTarget, setInitialPlaybackTarget] =
    useState<InitialTvPlaybackTarget | null>(null);
  const [startupEmbedGeneration, setStartupEmbedGeneration] =
    useState(initialEmbedGen);

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
    pendingUserGesturePlayRef.current = false;
    pendingAudioRestoreRef.current = null;
    scheduleSwrBootstrappedRef.current = false;
    paymentPlaybackRestoreRef.current = null;
    resetStartupPlaybackGuardState(startupPlaybackGuardRef.current);
    inFlightOrchestratedVideoIdRef.current = null;
    legacyVideoErrorReloadsRef.current = 0;
    startupGenerationRef.current += 1;
    setStartupEmbedGeneration(startupGenerationRef.current);
    provisionalInitialTargetRef.current = null;
    committedInitialEmbedRef.current = null;
    initialEmbedSuccessRecordedGenerationRef.current = null;
    prePlayReplacementLoadIssuedRef.current = false;
    prePlayExecutedSeekIssuedRef.current = false;
    initialEmbedMarkedStaleRef.current = false;
    lastEmbedSuccessRejectionReasonRef.current = null;
    preStableSeekSuppressedCountRef.current = 0;
    preStableCorrectiveSeekCountRef.current = 0;
    setInitialPlaybackTarget(null);
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
    livePreNoticeRef.current = livePreNotice;
  }, [livePreNotice]);

  useEffect(() => {
    dismissedPreNoticeIdsRef.current = new Set(dismissedPreNoticeIds);
  }, [dismissedPreNoticeIds]);

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
    playbackTabSnapshotRestoreAppliedRef.current = false;
  }, []);

  const remountPlayerForResume = useCallback((reason: string) => {
    tvTrace("playback", "player_resume_remount", { reason });
    playerRef.current = null;
    startupGenerationRef.current += 1;
    setStartupEmbedGeneration(startupGenerationRef.current);
    remountedThisHideShowCycleRef.current = true;
  }, []);

  const markPrePlayExecutedSeekIfNeeded = useCallback(() => {
    if (
      !startupPlaybackGuardRef.current.firstPlayReached &&
      isTvInitialLiveOffsetEmbedEnabled()
    ) {
      prePlayExecutedSeekIssuedRef.current = true;
    }
  }, []);

  const applyStartupStabilityGuardRelease = useCallback(
    (releaseReason: "stable_playback" | "terminal_failure") => {
      const guard = startupPlaybackGuardRef.current;
      if (releaseReason === "stable_playback") {
        markStartupStablePlayback(guard);
      } else {
        markStartupTerminalFailure(guard);
      }
    },
    []
  );

  const isOrchestrationBlockedByTerminalFailure = useCallback(() => {
    return shouldBlockStartupOrchestrationCommands(
      isTvStartupPlaybackGuardEnabled(),
      isTvStartupStabilityGuardActive(),
      startupPlaybackGuardRef.current
    );
  }, []);

  const recordInitialEmbedSuccessOnce = useCallback(
    (
      trigger: InitialEmbedSuccessTrigger,
      opts?: {
        liveVideoId?: string;
        liveScheduleIndex?: number;
        liveOffsetSeconds?: number;
      }
    ): boolean => {
      if (!isTvInitialLiveOffsetEmbedEnabled()) return false;

      const committed = committedInitialEmbedRef.current;
      if (!committed) return false;

      const activeGen = startupGenerationRef.current;
      if (
        !canRecordInitialEmbedSuccess(
          initialEmbedSuccessRecordedGenerationRef.current,
          activeGen,
          committed.startupGeneration
        )
      ) {
        return false;
      }

      const communityId = scheduleSourceCommunityIdRef.current;
      const source = communityId ? "community" : "global";

      let liveVideoId = opts?.liveVideoId ?? null;
      let liveScheduleIndex = opts?.liveScheduleIndex ?? null;
      let liveOffsetSeconds = opts?.liveOffsetSeconds ?? null;

      if (
        liveVideoId == null ||
        liveScheduleIndex == null ||
        liveOffsetSeconds == null
      ) {
        if (broadcastEpoch && items.length > 0 && totalDuration > 0) {
          const pos = resolveBroadcastPosition(
            items,
            broadcastEpoch,
            totalDuration,
            getNow()
          );
          liveVideoId =
            liveVideoId ??
            (pos.item?.channel?.url
              ? extractYoutubeID(pos.item.channel.url)
              : null);
          liveScheduleIndex = liveScheduleIndex ?? pos.scheduleIndex;
          liveOffsetSeconds = liveOffsetSeconds ?? pos.offsetSeconds;
        }
      }

      const evaluation = evaluateInitialEmbedSuccess({
        committedTarget: committed,
        activeStartupGeneration: activeGen,
        currentSource: source,
        currentCommunityId: communityId,
        currentVideoId: liveVideoId,
        currentScheduleIndex: liveScheduleIndex,
        currentLiveOffsetSeconds: liveOffsetSeconds,
        nowPerformanceMs: performance.now(),
        replacementLoadIssued: prePlayReplacementLoadIssuedRef.current,
        prePlaySeekExecuted: prePlayExecutedSeekIssuedRef.current,
        initialTargetMarkedStale: initialEmbedMarkedStaleRef.current,
        c1Enabled: true,
      });

      if (!evaluation.success) {
        if (lastEmbedSuccessRejectionReasonRef.current !== evaluation.reason) {
          lastEmbedSuccessRejectionReasonRef.current = evaluation.reason;
          tvStartupEvent("initial_embed_success_rejected", {
            trigger,
            reason: evaluation.reason,
            data: {
              startupGeneration: activeGen,
              videoIdHash: hashShortId(committed.videoId),
              currentIndex: liveScheduleIndex,
            },
          });
        }
        return false;
      }

      initialEmbedSuccessRecordedGenerationRef.current = activeGen;

      tvStartupEvent("initial_embed_target_confirmed", {
        trigger,
        data: {
          trigger,
          startupGeneration: activeGen,
          source,
          currentIndex: liveScheduleIndex,
          videoIdHash: hashShortId(committed.videoId),
          expectedOffsetSeconds: evaluation.expectedOffsetSeconds,
          currentLiveOffsetSeconds: liveOffsetSeconds,
          driftSeconds: evaluation.driftSeconds,
        },
      });

      if (isSyncBasedInitialEmbedSuccessTrigger(trigger)) {
        tvStartupEvent("initial_embed_target_matched_first_sync", {
          trigger,
          data: {
            videoIdHash: hashShortId(committed.videoId),
            startOffsetSeconds: liveOffsetSeconds,
            currentIndex: liveScheduleIndex,
          },
        });
      }

      tvStartupEvent("initial_reload_avoided", {
        trigger,
        data: {
          videoIdHash: hashShortId(committed.videoId),
          startOffsetSeconds: liveOffsetSeconds,
        },
      });

      return true;
    },
    [items, broadcastEpoch, totalDuration, getNow]
  );

  const requestPlayback = useCallback(
    (req: TvPlaybackRequest): boolean => {
      if (isOrchestrationBlockedByTerminalFailure()) {
        tvTrace("playback", "requestPlayback_blocked", {
          reason: "terminal_startup_failure",
          videoId: req.videoId,
        });
        return false;
      }

      tvTrace("playback", "requestPlayback", {
        reason: req.reason,
        videoId: req.videoId,
        startSeconds: req.startSeconds,
        scheduleIndex: req.scheduleIndex,
      });

      const guard = startupPlaybackGuardRef.current;
      const player = playerRef.current;
      if (
        shouldSuppressDuplicatePrePlayLoad({
          guardEnabled: isTvStartupPlaybackGuardEnabled(),
          firstPlayReached: guard.firstPlayReached,
          req,
          orchestrated: orchestratedPlaybackRef.current,
          playerState: null,
          inFlightVideoId: inFlightOrchestratedVideoIdRef.current,
        })
      ) {
        tvStartupEvent("duplicate_pre_play_load_suppressed", {
          trigger: req.reason,
          data: {
            videoIdHash: hashShortId(req.videoId),
            startOffsetSeconds: req.startSeconds,
            currentIndex: currentIndexRef.current,
            recoveryCount: guard.startupRecoveryCount,
            recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
          },
        });
        return false;
      }

      if (
        shouldSkipInitialReload(
          committedInitialEmbedRef.current,
          req,
          guard.firstPlayReached,
          performance.now(),
          isTvInitialLiveOffsetEmbedEnabled()
        )
      ) {
        recordInitialEmbedSuccessOnce("first_sync_request_playback", {
          liveVideoId: req.videoId,
          liveScheduleIndex: req.scheduleIndex ?? currentIndexRef.current,
          liveOffsetSeconds: req.startSeconds,
        });
        lastSyncedIndex.current = req.scheduleIndex ?? currentIndexRef.current;
        return false;
      }

      if (isSameOrchestratedPlayback(orchestratedPlaybackRef.current, req)) {
        const userIntent = isUserIntentPlaybackReason(req.reason);
        const action = resolveUnchangedPlaybackAction({
          userIntent,
          playerReady: !!player?.isReady(),
        });
        if (action === "replay") {
          player!.seekTo(req.startSeconds, true);
          playAlreadyLoadedWithGesture(
            player!,
            pendingAudioRestoreRef.current,
            "requestPlayback.replay"
          );
          tvTrace("playback", "requestPlayback_replay", {
            reason: req.reason,
            videoId: req.videoId,
            startSeconds: req.startSeconds,
          });
          return true;
        }
        if (action === "queue") {
          pendingPlaybackRequestRef.current = req;
          pendingUserGesturePlayRef.current = true;
          tvTrace("playback", "requestPlayback_queued_unchanged", {
            reason: req.reason,
            videoId: req.videoId,
            startSeconds: req.startSeconds,
          });
          return false;
        }
        tvTrace("playback", "requestPlayback_skipped", {
          reason: "unchanged",
          videoId: req.videoId,
          startSeconds: req.startSeconds,
        });
        return false;
      }

      if (!player?.isReady()) {
        pendingPlaybackRequestRef.current = req;
        if (isUserIntentPlaybackReason(req.reason)) {
          pendingUserGesturePlayRef.current = true;
        }
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
      inFlightOrchestratedVideoIdRef.current = req.videoId;
      lastOrchestratedCommandRef.current = "loadVideoById";
      if (!guard.firstPlayReached && isTvInitialLiveOffsetEmbedEnabled()) {
        prePlayReplacementLoadIssuedRef.current = true;
      }
      if (isTvStartupPlaybackGuardEnabled()) {
        markInitialCommandIssued(guard);
        if (guard.phase === "initial_command_issued") {
          guard.phase = "buffering_before_first_play";
        }
      }
      tvStartupEvent("orchestrated_playback_command_issued", {
        trigger: req.reason,
        data: {
          command: "loadVideoById",
          videoIdHash: hashShortId(req.videoId),
          startOffsetSeconds: req.startSeconds,
          muted: player.isMuted?.() ?? null,
          currentIndex: currentIndexRef.current,
          firstPlayReached: guard.firstPlayReached,
        },
      });
      pendingAudioRestoreRef.current = prepareMutedLoadForAutoplay(
        player,
        true
      );
      player.load(req.videoId, req.startSeconds);
      return true;
    },
    [recordInitialEmbedSuccessOnce, isOrchestrationBlockedByTerminalFailure]
  );

  const tryPendingUserGesturePlay = useCallback(() => {
    if (!pendingUserGesturePlayRef.current) return;
    const player = playerRef.current;
    if (!player?.isReady()) return;
    pendingUserGesturePlayRef.current = false;
    playWithUserGesture(
      player,
      pendingAudioRestoreRef.current,
      "TvProvider.pendingUserGesturePlay"
    );
  }, []);

  const flushPendingPlaybackRequest = useCallback(() => {
    const pending = pendingPlaybackRequestRef.current;
    if (!pending) {
      tryPendingUserGesturePlay();
      return;
    }
    pendingPlaybackRequestRef.current = null;
    requestPlayback(pending);
    tryPendingUserGesturePlay();
  }, [requestPlayback, tryPendingUserGesturePlay]);

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

  const advanceToNextEligibleStartupTarget = useCallback(
    (failedVideoId: string | null) => {
      if (isOrchestrationBlockedByTerminalFailure()) return;

      const guard = startupPlaybackGuardRef.current;
      if (failedVideoId) {
        guard.failedVideoIds.add(failedVideoId);
        tvStartupEvent("startup_error_target_skipped", {
          trigger: "startup_error_recovery",
          data: {
            videoIdHash: hashShortId(failedVideoId),
            failedStartupTargetCount: guard.failedVideoIds.size,
          },
        });
      }

      const fromIdx = currentIndexRef.current;
      const nextIdx = findNextEligibleScheduleIndex(
        items,
        fromIdx,
        guard.failedVideoIds,
        extractYoutubeID
      );
      if (nextIdx == null) {
        guard.startupRecoveryCapReached = true;
        tvStartupEvent("startup_recovery_cap_reached", {
          reason: "no_eligible_target",
          data: {
            recoveryCount: guard.startupRecoveryCount,
            recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
          },
        });
        if (isTvStartupStabilityGuardActive() && !guard.stablePlaybackReached) {
          if (markStartupTerminalFailure(guard)) {
            tvStartupEvent("startup_terminal_failure", {
              reason: "no_eligible_target",
              data: {
                recoveryCount: guard.startupRecoveryCount,
                recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
                failedTargetCount: guard.failedVideoIds.size,
              },
            });
            releaseStartupStabilityGuardOnce({
              reason: "terminal_failure",
              startupGeneration: startupGenerationRef.current,
            });
            tvStartupFinalizeFailed("no_eligible_startup_target");
          }
        } else {
          guard.phase = "failed";
        }
        return;
      }

      lastSyncedIndex.current = nextIdx;
      setCurrentIndex(nextIdx);
      currentIndexRef.current = nextIdx;

      const item = items[nextIdx];
      const videoId = item ? extractYoutubeID(item.channel?.url) : null;
      if (!videoId) return;

      resetPreStableCorrectiveSeekAllowance(guard, videoId);

      let startSeconds = item.seekBaseSeconds ?? 0;
      if (
        broadcastEpoch != null &&
        totalDuration > 0 &&
        modeRef.current === "GLOBAL"
      ) {
        const livePos = resolveBroadcastPosition(
          items,
          broadcastEpoch,
          totalDuration,
          getNow()
        );
        if (livePos.scheduleIndex === nextIdx) {
          startSeconds = livePos.offsetSeconds;
        }
      }

      requestPlayback({
        reason: "startup_error_advance",
        videoId,
        startSeconds,
        scheduleIndex: nextIdx,
      });
    },
    [
      items,
      requestPlayback,
      broadcastEpoch,
      totalDuration,
      getNow,
      isOrchestrationBlockedByTerminalFailure,
    ]
  );

  const notifyStartupPlayerPlaying = useCallback(() => {
    const guard = startupPlaybackGuardRef.current;
    const stabilityActive = isTvStartupStabilityGuardActive();
    const guardEnabled = isTvStartupPlaybackGuardEnabled();

    if (guardEnabled) {
      if (markStartupFirstPlay(guard)) {
        inFlightOrchestratedVideoIdRef.current = null;
        tvStartupEvent("first_play_guard_released", {
          trigger: "player_playing",
          data: {
            pendingLiveOffsetSeconds: guard.pendingLiveOffsetSeconds,
            pendingLiveScheduleIndex: guard.pendingLiveScheduleIndex,
            startupRecoveryCount: guard.startupRecoveryCount,
          },
        });
        if (stabilityActive) {
          markStartupAwaitingStablePlayback(guard);
          tvStartupEvent("startup_stability_guard_activated", {
            trigger: "player_playing",
            data: {
              recoveryCount: guard.startupRecoveryCount,
              recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
              failedTargetCount: guard.failedVideoIds.size,
            },
          });
        }
      }
    }
    if (isTvInitialLiveOffsetEmbedEnabled()) {
      recordInitialEmbedSuccessOnce("first_playing_fallback");
    }
  }, [recordInitialEmbedSuccessOnce]);

  const onInitialLiveOffsetEmbedCommitted = useCallback(
    (payload: {
      videoId: string;
      startOffsetSeconds: number;
      selectedIndex: number;
      startupGeneration: number;
    }) => {
      if (!isTvInitialLiveOffsetEmbedEnabled()) return;
      if (
        isStaleStartupGeneration(
          payload.startupGeneration,
          startupGenerationRef.current
        )
      ) {
        return;
      }
      if (modeRef.current !== "GLOBAL") return;

      const provisional = provisionalInitialTargetRef.current;
      const committed: CommittedInitialEmbed = {
        videoId: payload.videoId,
        startOffsetSeconds: payload.startOffsetSeconds,
        selectedIndex: payload.selectedIndex,
        startupGeneration: payload.startupGeneration,
        committedAtPerformanceMs: performance.now(),
        source:
          provisional?.source ??
          (scheduleSourceCommunityIdRef.current ? "community" : "global"),
        sourceCommunityId:
          provisional?.sourceCommunityId ??
          scheduleSourceCommunityIdRef.current,
      };
      committedInitialEmbedRef.current = committed;
      prePlayReplacementLoadIssuedRef.current = false;
      prePlayExecutedSeekIssuedRef.current = false;
      initialEmbedMarkedStaleRef.current = false;
      lastEmbedSuccessRejectionReasonRef.current = null;
      orchestratedPlaybackRef.current = {
        videoId: payload.videoId,
        startSeconds: payload.startOffsetSeconds,
      };
      inFlightOrchestratedVideoIdRef.current = payload.videoId;
      lastOrchestratedCommandRef.current = "initial_embed";

      if (isTvStartupPlaybackGuardEnabled()) {
        const guard = startupPlaybackGuardRef.current;
        markInitialCommandIssued(guard);
        if (guard.phase === "initial_command_issued") {
          guard.phase = "buffering_before_first_play";
        }
      }

      lastSyncedIndex.current = payload.selectedIndex;
      currentIndexRef.current = payload.selectedIndex;

      tvStartupEvent("initial_live_offset_embed_committed", {
        trigger: "iframe_mount",
        data: {
          videoIdHash: hashShortId(payload.videoId),
          startOffsetSeconds: payload.startOffsetSeconds,
          selectedIndex: payload.selectedIndex,
          startupGeneration: payload.startupGeneration,
          targetWasResolved: true,
        },
      });
    },
    []
  );

  const onInitialLiveOffsetEmbedConfirmed = useCallback(
    (payload: { startupGeneration: number }) => {
      if (!isTvInitialLiveOffsetEmbedEnabled()) return;
      const committed = committedInitialEmbedRef.current;
      if (
        !committed ||
        isStaleStartupGeneration(
          payload.startupGeneration,
          startupGenerationRef.current
        )
      ) {
        return;
      }

      const provisional = provisionalInitialTargetRef.current;
      const valid = isInitialTargetStillValid(
        provisional,
        committed,
        startupGenerationRef.current
      );

      if (!valid) {
        initialEmbedMarkedStaleRef.current = true;
        tvStartupEvent("initial_embed_target_stale", {
          reason: "target_changed_before_ready",
          data: {
            videoIdHash: hashShortId(committed.videoId),
            startupGeneration: payload.startupGeneration,
          },
        });
        return;
      }

      tvStartupEvent("initial_live_offset_embed_confirmed", {
        trigger: "youtube_onReady",
        data: {
          videoIdHash: hashShortId(committed.videoId),
          startOffsetSeconds: committed.startOffsetSeconds,
          targetWasResolved: true,
          startupGeneration: payload.startupGeneration,
        },
      });
    },
    []
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

    if (isOrchestrationBlockedByTerminalFailure()) {
      tvTrace("playback", "syncToLive_skipped", {
        reason: "terminal_startup_failure",
      });
      return;
    }

    const pos = resolveBroadcastPosition(
      items,
      broadcastEpoch,
      totalDuration,
      getNow()
    );

    const guard = startupPlaybackGuardRef.current;
    const stabilityContainment = isStartupStabilityContainmentActive(
      isTvStartupPlaybackGuardEnabled(),
      isTvStartupStabilityGuardActive(),
      guard
    );
    let effectivePos = pos;
    if (
      isTvStartupPlaybackGuardEnabled() &&
      (!guard.firstPlayReached || stabilityContainment) &&
      guard.failedVideoIds.size > 0
    ) {
      const skipped = resolvePositionSkippingFailedTargets(
        pos,
        items,
        guard.failedVideoIds,
        extractYoutubeID
      );
      effectivePos = {
        ...pos,
        scheduleIndex: skipped.scheduleIndex,
        offsetSeconds: skipped.offsetSeconds,
        item: (skipped.item ?? pos.item) as ScheduleItem | null,
      };
    }

    if (!effectivePos.item) {
      tvTrace("playback", "syncToLive_no_item", {
        loopPosition: effectivePos.loopPosition,
      });
      return;
    }

    const isNotice = effectivePos.item.segmentKind === "notice";
    if (!isNotice && !effectivePos.item.channel?.url) return;

    tvTrace("playback", "syncToLive", {
      mode: modeRef.current,
      currentIndex: currentIndexRef.current,
      lastSyncedIndex: lastSyncedIndex.current,
      offsetSeconds: effectivePos.offsetSeconds,
      scheduleIndex: effectivePos.scheduleIndex,
      segmentKind: effectivePos.item.segmentKind,
      itemId: effectivePos.item.id,
    });

    logTV("broadcast_sync", {
      mode: modeRef.current,
      currentIndex: currentIndexRef.current,
      offsetSeconds: effectivePos.offsetSeconds,
      scheduleIndex: effectivePos.scheduleIndex,
    });

    setLastLivePosition({
      scheduleIndex: effectivePos.scheduleIndex,
      offsetSeconds: effectivePos.offsetSeconds,
      loopPosition: effectivePos.loopPosition,
      totalDuration: effectivePos.totalDuration,
    });

    if (effectivePos.scheduleIndex !== lastSyncedIndex.current) {
      lastSyncedIndex.current = effectivePos.scheduleIndex;
      setCurrentIndex(effectivePos.scheduleIndex);

      if (!isNotice) {
        const channelUrl = effectivePos.item.channel?.url;
        if (!channelUrl) return;
        const videoId = extractYoutubeID(channelUrl);
        if (videoId) {
          resetPreStableCorrectiveSeekAllowance(guard, videoId);
          const sameVideo =
            orchestratedPlaybackRef.current?.videoId === videoId &&
            player.isReady();
          if (sameVideo) {
            const playerState = player.getPlayerState?.() ?? null;
            const preStableSeek = evaluatePreStableDriftSeek({
              stabilityContainmentActive: stabilityContainment,
              firstPlayReached: guard.firstPlayReached,
              playerState,
              videoId,
              preStableCorrectiveSeekVideoId:
                guard.preStableCorrectiveSeekVideoId,
              isDriftCorrection: true,
            });
            if (preStableSeek.suppress) {
              preStableSeekSuppressedCountRef.current += 1;
              tvStartupEvent("pre_stable_drift_seek_suppressed", {
                trigger: "syncToLive_coalesced_seek",
                data: {
                  reason: preStableSeek.reason,
                  playerState,
                  targetOffsetSeconds: effectivePos.offsetSeconds,
                  currentIndex: effectivePos.scheduleIndex,
                  videoIdHash: hashShortId(videoId),
                },
              });
              return;
            }
            tvTrace("playback", "syncToLive_coalesced_seek", {
              videoId,
              offsetSeconds: effectivePos.offsetSeconds,
              scheduleIndex: effectivePos.scheduleIndex,
            });
            orchestratedPlaybackRef.current = {
              videoId,
              startSeconds: effectivePos.offsetSeconds,
            };
            tvStartupEvent("orchestrated_playback_command_issued", {
              trigger: "syncToLive_coalesced_seek",
              data: {
                command: "seekTo",
                videoIdHash: hashShortId(videoId),
                startOffsetSeconds: effectivePos.offsetSeconds,
                currentIndex: effectivePos.scheduleIndex,
              },
            });
            lastOrchestratedCommandRef.current = "seekTo";
            if (
              "issueCorrective" in preStableSeek &&
              preStableSeek.issueCorrective
            ) {
              markPreStableCorrectiveSeekIssued(guard, videoId);
              preStableCorrectiveSeekCountRef.current += 1;
              tvStartupEvent("pre_stable_corrective_seek_issued", {
                trigger: "syncToLive_coalesced_seek",
                data: {
                  playerState,
                  targetOffsetSeconds: effectivePos.offsetSeconds,
                  currentIndex: effectivePos.scheduleIndex,
                  videoIdHash: hashShortId(videoId),
                },
              });
            }
            markPrePlayExecutedSeekIfNeeded();
            player.seekTo(effectivePos.offsetSeconds, false);
          } else {
            requestPlayback({
              reason: "syncToLive",
              videoId,
              startSeconds: effectivePos.offsetSeconds,
              scheduleIndex: effectivePos.scheduleIndex,
            });
          }
        }
      } else {
        tvTrace("playback", "syncToLive_notice_pause", {
          scheduleIndex: effectivePos.scheduleIndex,
        });
        player.pauseProgrammatic?.();
      }
    } else if (!isNotice) {
      const channelUrl = effectivePos.item.channel?.url;
      if (!channelUrl) return;
      const videoId = extractYoutubeID(channelUrl);
      const orchestrated = orchestratedPlaybackRef.current;
      if (videoId && (!orchestrated || orchestrated.videoId !== videoId)) {
        requestPlayback({
          reason: "syncToLive",
          videoId,
          startSeconds: effectivePos.offsetSeconds,
          scheduleIndex: effectivePos.scheduleIndex,
        });
      } else {
        if (
          isTvInitialLiveOffsetEmbedEnabled() &&
          !guard.firstPlayReached &&
          videoId &&
          orchestrated?.videoId === videoId
        ) {
          recordInitialEmbedSuccessOnce("first_sync_same_index", {
            liveVideoId: videoId,
            liveScheduleIndex: effectivePos.scheduleIndex,
            liveOffsetSeconds: effectivePos.offsetSeconds,
          });
        }

        if (!videoId) return;

        const actual = player.getCurrentTime();
        if (Math.abs(actual - effectivePos.offsetSeconds) > DRIFT_THRESHOLD_S) {
          const playerState = player.getPlayerState?.() ?? null;
          const preStableSeek = evaluatePreStableDriftSeek({
            stabilityContainmentActive: stabilityContainment,
            firstPlayReached: guard.firstPlayReached,
            playerState,
            videoId,
            preStableCorrectiveSeekVideoId:
              guard.preStableCorrectiveSeekVideoId,
            isDriftCorrection: true,
          });

          if (preStableSeek.suppress) {
            preStableSeekSuppressedCountRef.current += 1;
            tvStartupEvent("pre_stable_drift_seek_suppressed", {
              trigger: "syncToLive_drift_seek",
              data: {
                reason: preStableSeek.reason,
                playerState,
                actual,
                targetOffsetSeconds: effectivePos.offsetSeconds,
                currentIndex: effectivePos.scheduleIndex,
                videoIdHash: hashShortId(videoId),
                firstPlayReached: guard.firstPlayReached,
                stablePlaybackReached: guard.stablePlaybackReached,
              },
            });
          } else if (
            shouldSuppressPrePlayDriftSeek({
              guardEnabled: isTvStartupPlaybackGuardEnabled(),
              firstPlayReached: guard.firstPlayReached,
              isDriftCorrection: true,
            })
          ) {
            guard.pendingLiveOffsetSeconds = effectivePos.offsetSeconds;
            guard.pendingLiveScheduleIndex = effectivePos.scheduleIndex;
            tvStartupEvent("pre_play_drift_seek_suppressed", {
              trigger: "syncToLive_drift_seek",
              data: {
                actual,
                targetOffsetSeconds: effectivePos.offsetSeconds,
                currentIndex: effectivePos.scheduleIndex,
                firstPlayReached: guard.firstPlayReached,
              },
            });
          } else {
            tvTrace("playback", "syncToLive_drift_seek", {
              actual,
              target: effectivePos.offsetSeconds,
            });
            orchestratedPlaybackRef.current = orchestratedPlaybackRef.current
              ? {
                  ...orchestratedPlaybackRef.current,
                  startSeconds: effectivePos.offsetSeconds,
                }
              : null;
            if (
              "issueCorrective" in preStableSeek &&
              preStableSeek.issueCorrective
            ) {
              markPreStableCorrectiveSeekIssued(guard, videoId);
              preStableCorrectiveSeekCountRef.current += 1;
              tvStartupEvent("pre_stable_corrective_seek_issued", {
                trigger: "syncToLive_drift_seek",
                data: {
                  playerState,
                  actual,
                  targetOffsetSeconds: effectivePos.offsetSeconds,
                  currentIndex: effectivePos.scheduleIndex,
                  videoIdHash: hashShortId(videoId),
                },
              });
            }
            tvStartupEvent("orchestrated_playback_command_issued", {
              trigger: "syncToLive_drift_seek",
              data: {
                command: "seekTo",
                startOffsetSeconds: effectivePos.offsetSeconds,
                currentIndex: effectivePos.scheduleIndex,
              },
            });
            lastOrchestratedCommandRef.current = "seekTo";
            markPrePlayExecutedSeekIfNeeded();
            player.seekTo(effectivePos.offsetSeconds, false);
          }
        }

        const playerState = player.getPlayerState?.() ?? null;
        if (playerState === "ENDED") {
          tvTrace("playback", "syncToLive_ended_resume", {
            scheduleIndex: effectivePos.scheduleIndex,
            offsetSeconds: effectivePos.offsetSeconds,
          });
          orchestratedPlaybackRef.current = orchestratedPlaybackRef.current
            ? {
                ...orchestratedPlaybackRef.current,
                startSeconds: effectivePos.offsetSeconds,
              }
            : { videoId, startSeconds: effectivePos.offsetSeconds };
          markPrePlayExecutedSeekIfNeeded();
          player.seekTo(effectivePos.offsetSeconds, false);
          player.play();
        }
      }
    }
  }, [
    broadcastEpoch,
    items,
    totalDuration,
    getNow,
    requestPlayback,
    recordInitialEmbedSuccessOnce,
    markPrePlayExecutedSeekIfNeeded,
    isOrchestrationBlockedByTerminalFailure,
  ]);

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
      if (visible) {
        queueMicrotask(() => {
          applyTabPlaybackSnapshotRestoreRef.current("setPlayerVisible");
          flushPendingPlaybackRequest();
          if (modeRef.current === "GLOBAL") {
            maybeSyncToLive("setPlayerVisible");
          } else {
            const seek = pendingTabSnapshotSeekRef.current;
            const player = playerRef.current;
            if (player?.isReady() && seek != null) {
              player.seekTo(seek, false);
              pendingTabSnapshotSeekRef.current = null;
            }
          }
        });
      }
      if (!visible) {
        paymentPlaybackRestoreRef.current = null;
      }
    },
    [maybeSyncToLive, flushPendingPlaybackRequest]
  );

  const resumePlayerAfterForeground = useCallback(
    (source: string, persisted = false) => {
      if (persisted) documentWasHiddenRef.current = true;
      const player = playerRef.current;
      if (
        shouldRemountTvPlayer({
          documentWasHidden: documentWasHiddenRef.current,
          visibilityState: "visible",
          startupInFlight: initialStartupInFlightRef.current,
          firstPlayReached: startupPlaybackGuardRef.current.firstPlayReached,
          iframeLive: player?.isIframeLive?.() ?? false,
          commandReady: !!player?.isReady(),
          playerState: player?.getPlayerState?.() ?? null,
          remountedThisHideShowCycle: remountedThisHideShowCycleRef.current,
        })
      ) {
        remountPlayerForResume(source);
        return;
      }
      flushPendingPlaybackRequest();
      if (modeRef.current === "GLOBAL") {
        maybeSyncToLive(source);
      }
    },
    [flushPendingPlaybackRequest, maybeSyncToLive, remountPlayerForResume]
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
      pendingUserGesturePlayRef.current = false;
      postPaymentAxisRef.current = false;
      if (!startupPlaybackGuardRef.current.firstPlayReached) {
        committedInitialEmbedRef.current = null;
        provisionalInitialTargetRef.current = null;
        setInitialPlaybackTarget(null);
      }
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

      if (
        isTvInitialLiveOffsetEmbedEnabled() &&
        modeRef.current === "GLOBAL" &&
        !paymentActiveRef.current &&
        liveItem &&
        liveItem.segmentKind !== "notice" &&
        liveItem.channel?.url
      ) {
        const videoId = extractYoutubeID(liveItem.channel.url);
        if (videoId) {
          const revision =
            (data.scheduleRevisions?.ongoing as string | number | undefined) ??
            (data.activeScheduleId as string | undefined) ??
            null;
          const target = buildProvisionalInitialTarget({
            startupGeneration: startupGenerationRef.current,
            source: scheduleSourceCommunityIdRef.current
              ? "community"
              : "global",
            sourceCommunityId: scheduleSourceCommunityIdRef.current,
            scheduleRevision: revision,
            selectedIndex: live.scheduleIndex,
            videoId,
            startOffsetSeconds: live.offsetSeconds,
            resolvedAtPerformanceMs: performance.now(),
          });
          provisionalInitialTargetRef.current = target;
          setInitialPlaybackTarget(target);
        }
      }
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
    if (!player?.isReady()) return;
    const pending = pendingAudioRestoreRef.current;
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
    requestTvYoutubeApiWarmup({ trigger: "tv_provider_mounted" });
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

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        documentWasHiddenRef.current = true;
        remountedThisHideShowCycleRef.current = false;
        return;
      }
      if (document.visibilityState === "visible") {
        resumePlayerAfterForeground("visibilitychange");
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      resumePlayerAfterForeground("pageshow", event.persisted);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [resumePlayerAfterForeground]);

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

  const applyTabPlaybackSnapshotRestore = useCallback(
    (trigger: string) => {
      const flushPendingSeek = () => {
        const seek = pendingTabSnapshotSeekRef.current;
        const player = playerRef.current;
        if (seek == null || !player?.isReady()) return;
        player.seekTo(seek, false);
        pendingTabSnapshotSeekRef.current = null;
      };

      if (playbackTabSnapshotRestoreAppliedRef.current) {
        flushPendingSeek();
        return;
      }

      const snap = readTvPlaybackSnapshot();
      if (!snap) return;

      const currentCommunity = scheduleSourceCommunityIdRef.current ?? null;
      if (snap.communityId !== currentCommunity) return;

      playbackTabSnapshotRestoreAppliedRef.current = true;

      if (snap.mode === "LOCAL") {
        let index = snap.currentIndex;
        if (typeof window !== "undefined") {
          try {
            const stored = sessionStorage.getItem(SESSION_LOCAL_INDEX_KEY);
            if (stored != null) {
              const parsed = parseInt(stored, 10);
              if (!Number.isNaN(parsed)) index = parsed;
            }
          } catch {
            /* private mode */
          }
        }

        const len = itemsLenRef.current;
        if (len > 0) {
          index = Math.max(0, Math.min(index, len - 1));
        }

        enterLocalMode("tab_return", index);

        const item = items[index];
        const videoId =
          snap.videoId ?? extractYoutubeID(item?.channel?.url ?? "") ?? null;
        const startSeconds = Math.max(0, snap.startSeconds);

        if (videoId) {
          requestPlayback({
            reason: "tab_snapshot_restore",
            videoId,
            startSeconds,
            scheduleIndex: index,
          });
        } else {
          pendingTabSnapshotSeekRef.current = startSeconds;
        }

        tvTrace("navigation", "tab_snapshot_restore_local", {
          trigger,
          index,
          startSeconds: snap.startSeconds,
          videoId,
        });
      } else {
        tvTrace("navigation", "tab_snapshot_restore_global", { trigger });
      }

      flushPendingSeek();
    },
    [enterLocalMode, items, requestPlayback]
  );

  useEffect(() => {
    applyTabPlaybackSnapshotRestoreRef.current =
      applyTabPlaybackSnapshotRestore;
  }, [applyTabPlaybackSnapshotRestore]);

  useEffect(() => {
    if (!items.length) return;
    applyTabPlaybackSnapshotRestore("items_loaded");
  }, [items.length, applyTabPlaybackSnapshotRestore]);

  const enterGlobalMode = useCallback(() => {
    const fromMode = modeRef.current;
    postPaymentAxisRef.current = false;
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
    if (fromMode !== "GLOBAL") {
      queueMicrotask(() => {
        if (paymentActiveRef.current) return;
        if (!broadcastEpoch || !items.length || !totalDuration) return;
        const player = playerRef.current;
        if (!player?.isReady()) return;
        const pos = resolveBroadcastPosition(
          items,
          broadcastEpoch,
          totalDuration,
          getNow()
        );
        if (pos.item?.segmentKind === "notice") return;
        const state = player.getPlayerState?.() ?? null;
        if (state !== "PLAYING" && state !== "BUFFERING") {
          player.play();
        }
      });
    }
  }, [syncToLive, broadcastEpoch, items, totalDuration, getNow]);

  const goLive = enterGlobalMode;

  const dismissPreNotice = useCallback((enforcementId: string) => {
    setDismissedPreNoticeIds(prev =>
      prev.includes(enforcementId) ? prev : [...prev, enforcementId]
    );
    setLocalPreNoticeSnapshot(null);
  }, []);

  const isPreNoticeDismissed = useCallback(
    (enforcementId: string) => dismissedPreNoticeIds.includes(enforcementId),
    [dismissedPreNoticeIds]
  );

  const restorePreNoticeLocal = useCallback(() => {
    const snap = localPreNoticeSnapshot;
    if (!snap) return;
    dismissPreNotice(snap.enforcementId);
    const player = playerRef.current;
    if (player?.isReady()) {
      try {
        player.seekTo(snap.seekSeconds, false);
        if (snap.wasPlaying) player.play();
        else player.pause();
      } catch {
        /* YT iframe may be detached */
      }
    }
  }, [localPreNoticeSnapshot, dismissPreNotice]);

  /** Live broadcast index + pre-notice axis — updated in both GLOBAL and LOCAL. */
  useEffect(() => {
    if (!broadcastEpoch || !items.length || !totalDuration) return;

    const tick = () => {
      const now = getNow();
      const pos = resolveBroadcastPosition(
        items,
        broadcastEpoch,
        totalDuration,
        now
      );
      if (pos.item) {
        setLiveBroadcastIndex(pos.scheduleIndex);
      }

      const preNotice = resolveLivePreNoticeFromAxis(
        items,
        broadcastEpoch,
        totalDuration,
        now
      );
      setLivePreNotice(preNotice);

      const enfId = preNotice?.enforcementId ?? null;
      const prevEnfId = prevLivePreNoticeEnfIdRef.current;

      if (prevEnfId && enfId !== prevEnfId) {
        if (
          !dismissedPreNoticeIdsRef.current.has(prevEnfId) &&
          modeRef.current === "LOCAL" &&
          !enfId
        ) {
          enterGlobalMode();
        }
        setDismissedPreNoticeIds(prev => prev.filter(id => id !== prevEnfId));
        localPreNoticeSnapshottedEnfRef.current = null;
        setLocalPreNoticeSnapshot(null);
      }

      if (
        preNotice &&
        modeRef.current === "LOCAL" &&
        !dismissedPreNoticeIdsRef.current.has(preNotice.enforcementId)
      ) {
        if (
          localPreNoticeSnapshottedEnfRef.current !== preNotice.enforcementId
        ) {
          localPreNoticeSnapshottedEnfRef.current = preNotice.enforcementId;
          const player = playerRef.current;
          let seekSeconds = 0;
          let wasPlaying = false;
          if (player?.isReady()) {
            try {
              seekSeconds = player.getCurrentTime();
              const state = player.getPlayerState();
              wasPlaying = state === "PLAYING" || state === "BUFFERING";
              player.pauseProgrammatic?.();
            } catch {
              /* YT iframe may be detached */
            }
          }
          setLocalPreNoticeSnapshot({
            enforcementId: preNotice.enforcementId,
            index: currentIndexRef.current,
            seekSeconds,
            wasPlaying,
          });
        }
      }

      prevLivePreNoticeEnfIdRef.current = enfId;
    };

    tick();
    const id = setInterval(tick, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [broadcastEpoch, items, totalDuration, getNow, enterGlobalMode]);

  const handleStartupPlayerError = useCallback(
    (youtubeErrorCode: number) => {
      const player = playerRef.current;
      const failedVideoId =
        orchestratedPlaybackRef.current?.videoId ??
        (items[currentIndexRef.current]
          ? extractYoutubeID(
              (items[currentIndexRef.current] as ScheduleItem).channel?.url
            )
          : null);

      tvStartupEvent("player_error", {
        trigger: "youtube_onError",
        data: {
          youtubeErrorCode,
          videoIdHash: hashShortId(failedVideoId),
          currentIndex: currentIndexRef.current,
          firstPlayReached: startupPlaybackGuardRef.current.firstPlayReached,
          startupRecoveryCount:
            startupPlaybackGuardRef.current.startupRecoveryCount,
          commandBeforeError: lastOrchestratedCommandRef.current,
        },
      });

      inFlightOrchestratedVideoIdRef.current = null;

      if (!isTvStartupPlaybackGuardEnabled()) {
        if (!player?.isReady()) return;
        if (!failedVideoId) return;
        if (legacyVideoErrorReloadsRef.current >= 1) return;
        legacyVideoErrorReloadsRef.current += 1;
        if (modeRef.current === "GLOBAL") {
          enterGlobalMode();
        } else {
          reloadCurrentPlaybackAt(Math.max(0, player.getCurrentTime()));
        }
        return;
      }

      const guard = startupPlaybackGuardRef.current;
      const stabilityGuardEnabled = isTvStartupStabilityGuardActive();
      const lifecyclePhase = getStartupErrorLifecyclePhase(guard);

      if (
        stabilityGuardEnabled &&
        guard.firstPlayReached &&
        !guard.stablePlaybackReached
      ) {
        tvStartupEvent("post_first_play_pre_stable_error", {
          trigger: "youtube_onError",
          data: {
            youtubeErrorCode,
            videoIdHash: hashShortId(failedVideoId),
            currentIndex: currentIndexRef.current,
            lifecyclePhase,
            playerState: player?.getPlayerState?.() ?? null,
            recoveryCount: guard.startupRecoveryCount,
            recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
            firstPlayReached: guard.firstPlayReached,
            stablePlaybackReached: guard.stablePlaybackReached,
          },
        });
      }

      const errorKind = classifyYoutubeErrorKind(youtubeErrorCode);
      tvStartupEvent("youtube_error_classified", {
        trigger: "youtube_onError",
        data: {
          youtubeErrorCode,
          errorKind,
          videoIdHash: hashShortId(failedVideoId),
          currentIndex: currentIndexRef.current,
          firstPlayReached: guard.firstPlayReached,
          stablePlaybackReached: guard.stablePlaybackReached,
          lifecyclePhase,
          recoveryCount: guard.startupRecoveryCount,
          recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
        },
      });

      if (isOrchestrationBlockedByTerminalFailure()) {
        return;
      }

      const decision = classifyStartupPlayerError({
        youtubeErrorCode,
        videoId: failedVideoId,
        firstPlayReached: guard.firstPlayReached,
        stablePlaybackReached: guard.stablePlaybackReached,
        stabilityGuardEnabled,
        startupRecoveryCount: guard.startupRecoveryCount,
        failedVideoIds: guard.failedVideoIds,
        transientRetriedVideoIds: guard.transientRetriedVideoIds,
      });

      if (decision.action === "legacy_per_video") {
        if (!player?.isReady()) return;
        if (!failedVideoId) return;
        if (legacyVideoErrorReloadsRef.current >= 1) return;
        legacyVideoErrorReloadsRef.current += 1;
        if (modeRef.current === "GLOBAL") {
          enterGlobalMode();
        } else {
          reloadCurrentPlaybackAt(Math.max(0, player.getCurrentTime()));
        }
        return;
      }

      if (decision.action === "skip_failed_target") {
        advanceToNextEligibleStartupTarget(null);
        return;
      }

      if (decision.action === "cap_reached") {
        guard.startupRecoveryCapReached = true;
        tvStartupEvent("startup_recovery_cap_reached", {
          reason: decision.reason,
          data: {
            youtubeErrorCode,
            recoveryCount: guard.startupRecoveryCount,
            recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
            lifecyclePhase,
          },
        });
        if (stabilityGuardEnabled && !guard.stablePlaybackReached) {
          if (markStartupTerminalFailure(guard)) {
            tvStartupEvent("startup_terminal_failure", {
              reason: decision.reason,
              data: {
                youtubeErrorCode,
                recoveryCount: guard.startupRecoveryCount,
                recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
                failedTargetCount: guard.failedVideoIds.size,
                lifecyclePhase,
              },
            });
            releaseStartupStabilityGuardOnce({
              reason: "terminal_failure",
              startupGeneration: startupGenerationRef.current,
            });
            tvStartupFinalizeFailed("startup_recovery_cap_reached");
          }
        } else {
          guard.phase = "failed";
        }
        return;
      }

      guard.startupRecoveryCount += 1;
      tvStartupEvent("startup_error_recovery_started", {
        trigger: decision.reason,
        data: {
          youtubeErrorCode,
          recoveryDecision: decision.action,
          videoIdHash: hashShortId(failedVideoId),
          recoveryCount: guard.startupRecoveryCount,
          recoveryCap: MAX_STARTUP_PLAYER_RECOVERIES,
        },
      });

      if (decision.action === "advance_next") {
        resetPreStableCorrectiveSeekAllowance(guard, null);
        advanceToNextEligibleStartupTarget(failedVideoId);
        return;
      }

      if (decision.action === "retry_once") {
        if (failedVideoId) {
          guard.transientRetriedVideoIds.add(failedVideoId);
        }
        if (modeRef.current === "GLOBAL") {
          lastSyncedIndex.current = -1;
          syncToLive();
        } else if (player?.isReady() && failedVideoId) {
          requestPlayback({
            reason: "startup_error_recovery",
            videoId: failedVideoId,
            startSeconds: Math.max(0, player.getCurrentTime()),
            scheduleIndex: currentIndexRef.current,
          });
        }
      }
    },
    [
      items,
      enterGlobalMode,
      reloadCurrentPlaybackAt,
      syncToLive,
      requestPlayback,
      advanceToNextEligibleStartupTarget,
      isOrchestrationBlockedByTerminalFailure,
    ]
  );

  useLayoutEffect(() => {
    if (!isTvStartupStabilityGuardActive()) {
      setTvStartupStabilityGuardReleaseCallback(null);
      return;
    }
    setTvStartupStabilityGuardReleaseCallback(
      ({ reason, startupGeneration }) => {
        if (
          startupGeneration != null &&
          isStaleStartupGeneration(
            startupGeneration,
            startupGenerationRef.current
          )
        ) {
          return;
        }
        applyStartupStabilityGuardRelease(reason);
      },
      () => startupGenerationRef.current
    );
    return () => setTvStartupStabilityGuardReleaseCallback(null);
  }, [applyStartupStabilityGuardRelease]);

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
      const activePreNotice = livePreNoticeRef.current;
      if (
        activePreNotice &&
        !dismissedPreNoticeIdsRef.current.has(activePreNotice.enforcementId)
      ) {
        dismissPreNotice(activePreNotice.enforcementId);
      }

      let playIndex = index;
      if (
        items[playIndex]?.segmentKind === "notice" &&
        !postPaymentAxisRef.current
      ) {
        playIndex = skipNoticeSegments(items, playIndex);
      }

      tvTrace("playback", "loadLocalAtIndex", {
        index,
        playIndex,
        source: opts.source,
      });

      const item = items[playIndex];
      if (!item) {
        tvTrace("playback", "loadLocalAtIndex_missing_item", {
          index,
          playIndex,
        });
        return;
      }

      const videoId = extractYoutubeID(item.channel?.url ?? "");
      if (!videoId) {
        tvTrace("playback", "loadLocalAtIndex_no_video_id", {
          index: playIndex,
          itemId: item.id,
        });
        return;
      }

      setPlayingItemOverride(null);
      setSchedulePlayingSlot({
        scope: "active",
        rowIndex: playIndex,
        source: opts.source,
      });
      if (opts.updatePreviewPin) {
        setPreviewPinIndex(playIndex);
      }
      enterLocalMode("playlist", playIndex);

      requestPlayback({
        reason: "loadLocal",
        videoId,
        startSeconds: 0,
        scheduleIndex: playIndex,
      });
      if (opts.userGesture) {
        const player = playerRef.current;
        if (player?.isReady()) {
          playWithUserGesture(
            player,
            pendingAudioRestoreRef.current,
            "loadLocalAtIndex"
          );
        } else {
          pendingUserGesturePlayRef.current = true;
        }
      }
    },
    [items, enterLocalMode, requestPlayback, dismissPreNotice]
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
      if (!item?.channel?.url) {
        tvTrace("playback", "playLocalScheduleItem_no_url", {
          itemId: item?.id,
        });
        return;
      }
      const idx = items.findIndex((i: any) => i.id === item.id);
      if (idx >= 0) {
        playLocalFromSchedule(idx);
        return;
      }
      const altIdx = alternateBatchItems.findIndex(
        (i: any) => i.id === item.id
      );
      if (altIdx < 0) {
        tvTrace("playback", "playLocalScheduleItem_not_found", {
          itemId: item.id,
          alternateBatchSize: alternateBatchItems.length,
        });
        return;
      }

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
        } else {
          pendingUserGesturePlayRef.current = true;
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

      const playbackMode = resolveEnforcementPlaybackMode(
        items as ScheduleItem[],
        enfId,
        broadcastEpoch,
        totalDuration,
        getNow()
      );

      tvTrace("playback", "playEnforcementProgram", {
        enforcementId: enfId,
        mode: playbackMode.kind,
      });

      if (playbackMode.kind === "live") {
        setPlayingItemOverride(null);
        setSchedulePlayingSlot({
          scope: "active",
          rowIndex: playbackMode.scheduleIndex,
          source: "schedule",
        });
        enterGlobalMode();
        return;
      }

      if (playbackMode.kind === "local_schedule") {
        playLocalFromSchedule(playbackMode.scheduleIndex);
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
      items,
      broadcastEpoch,
      totalDuration,
      getNow,
      playLocalFromSchedule,
      enterLocalMode,
      enterGlobalMode,
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
    const originMode = modeRef.current;
    const snap: TvPaymentPlaybackSnapshot = {
      mode: "LOCAL",
      originMode,
      currentIndex: currentIndexRef.current,
      currentTime: player?.isReady() ? player.getCurrentTime() : 0,
      wasPlaying: isPlayingRef.current,
      wasMuted: readTvMutePref(),
      playingItemOverrideId:
        (playingItemOverride as { id?: string } | null)?.id ?? null,
      schedulePlayingSlot,
      localModeReason: "tip_drawer",
    };
    if (originMode === "GLOBAL") {
      enterLocalMode("tip_drawer", currentIndexRef.current);
    }
    paymentSnapshotRef.current = snap;
    const persisted: PersistedTvPaymentSnapshot = { v: 2, ...snap };
    writePersistedPaymentSnapshot(persisted);
    paymentActiveRef.current = true;
    setIsPaymentActive(true);
    player?.pause();
  }, [playingItemOverride, schedulePlayingSlot, enterLocalMode]);

  const preparePlaybackForTipDrawer = useCallback(
    (_hasSelectedTips: boolean) => {
      const player = playerRef.current;
      const originMode = modeRef.current;
      if (originMode === "GLOBAL") {
        enterLocalMode("tip_drawer", currentIndexRef.current);
      }
      const idx = currentIndexRef.current;
      const snap: TvPaymentPlaybackSnapshot = {
        mode: "LOCAL",
        originMode,
        currentIndex: idx,
        currentTime: player?.isReady() ? player.getCurrentTime() : 0,
        wasPlaying: isPlayingRef.current,
        wasMuted: readTvMutePref(),
        playingItemOverrideId:
          (playingItemOverride as { id?: string } | null)?.id ?? null,
        schedulePlayingSlot: { scope: "active", rowIndex: idx },
        localModeReason: "tip_drawer",
      };
      paymentSnapshotRef.current = snap;
      writePersistedPaymentSnapshot({ v: 2, ...snap });
      paymentActiveRef.current = true;
      setIsPaymentActive(true);
      player?.pause();
    },
    [enterLocalMode, playingItemOverride]
  );

  const snapshotPlaybackForPaymentRedirect = useCallback(() => {
    const player = playerRef.current;
    const originMode = modeRef.current;
    const snap: TvPaymentPlaybackSnapshot = {
      mode: "LOCAL",
      originMode,
      currentIndex: currentIndexRef.current,
      currentTime: player?.isReady() ? player.getCurrentTime() : 0,
      wasPlaying: isPlayingRef.current,
      wasMuted: readTvMutePref(),
      playingItemOverrideId:
        (playingItemOverride as { id?: string } | null)?.id ?? null,
      schedulePlayingSlot,
      localModeReason:
        originMode === "GLOBAL" ? "payment_redirect" : localModeReason,
    };
    writePersistedPaymentSnapshot({ v: 2, ...snap });
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
    const originMode = snap.originMode ?? snap.mode;

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
      queueMicrotask(() => {
        applyPendingPlaybackRestore();
        applyPendingAudioRestore();
      });
      return;
    }

    flushPendingSchedule();

    if (originMode === "GLOBAL") {
      postPaymentAxisRef.current = true;
    }

    setPlayingItemOverride(resolveOverride(snap.playingItemOverrideId));
    setSchedulePlayingSlot(snap.schedulePlayingSlot);
    setLocalModeReason(snap.localModeReason);

    setMode("LOCAL");
    modeRef.current = "LOCAL";
    setCurrentIndex(snap.currentIndex);
    currentIndexRef.current = snap.currentIndex;

    paymentActiveRef.current = false;
    setIsPaymentActive(false);
    paymentPlaybackRestoreRef.current = {
      wasMuted: snap.wasMuted,
      wasPlaying: snap.wasPlaying,
    };

    if (!player?.isReady()) {
      return;
    }

    player.seekTo(snap.currentTime, false);
    applyPendingPlaybackRestore();
    applyPendingAudioRestore();
  }, [
    items,
    alternateBatchItems,
    applySchedulePayloadCore,
    syncToLive,
    applyPendingPlaybackRestore,
    applyPendingAudioRestore,
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
        applyPendingPlaybackRestore();
        applyPendingAudioRestore();
      });
      clearPendingReturnSoon();
      return;
    }

    const originMode = persisted.originMode ?? persisted.mode;

    if (originMode === "GLOBAL") {
      postPaymentAxisRef.current = true;
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
      applyPendingAudioRestore();
    });
    clearPendingReturnSoon();
  }, [
    isReady,
    items,
    alternateBatchItems,
    syncToLive,
    applyPendingPlaybackRestore,
    applyPendingAudioRestore,
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

        livePreNotice,
        localPreNoticeSnapshot,
        dismissPreNotice,
        restorePreNoticeLocal,
        isPreNoticeDismissed,

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
        flushPendingPlaybackRequest,
        applyTabPlaybackSnapshotRestore,

        pauseForPayment,
        preparePlaybackForTipDrawer,
        snapshotPlaybackForPaymentRedirect,
        resumeAfterPayment,
        applyPendingPlaybackRestore,
        applyPendingAudioRestore,
        unregisterTvPlayer,
        reloadCurrentPlaybackAt,
        handleStartupPlayerError,
        notifyStartupPlayerPlaying,
        initialPlaybackTarget,
        startupEmbedGeneration,
        onInitialLiveOffsetEmbedCommitted,
        onInitialLiveOffsetEmbedConfirmed,

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
