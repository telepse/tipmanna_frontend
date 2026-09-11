/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

// TEST_REVERT_DEBUG_123

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getDiscoverPanelLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getSpotlightContents,
  getDiscoveryEventsAction,
  getRecommendedContents,
} from "@/actions/contents";
import { getDiscoveryPlaylistsAction } from "@/actions/host-playlist";
import {
  getAllTopTippers,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import {
  getMeJoinedCommunitiesAction,
  getMyCommunitiesAction,
  getCommunityExploreCatalogAction,
  getTopCommunitiesAction,
  type CommunityExploreCatalogRow,
} from "@/actions/communities";
import { ExploreCommunityPickerMenu } from "@/components/explore/explore-community-picker-menu";
import { cn } from "@/lib/utils";
import { takeRecentDiscoveryPrograms } from "@/lib/discover-programs";
import {
  buildTvPickerOptionsForUser,
  isTipmannaSystemCommunity,
  type TvCommunityBrief,
} from "@/lib/tv-community-picker";

import type { ExploreFeedClientHandle } from "./explore-feed-client";
import { ExploreTvScheduleFeed } from "./explore-tv-schedule-feed";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import {
  exploreOpenTargetFromUrl,
  buildExploreVideoHandoffHref,
  exploreVideoHandoffKeyFromUrl,
  readExplorePendingHandoff,
  clearExplorePendingHandoff,
  handoffKeyForTarget,
  mergeExploreHandoffTargets,
} from "@/lib/explore-video-navigation";
import { warmExploreVideoHandoff } from "@/lib/explore-video-handoff-warm";
import {
  prefetchExploreCommunityFeed,
  prefetchExploreFeedInitial,
  prefetchExploreSavesFeed,
  scheduleExploreFeedPrefetchIdle,
  seedExploreFeedBootFromSsr,
  seedExploreE2eSavesBoot,
} from "@/lib/explore-feed-prefetch-cache";
import { useNotificationDrawerQuery } from "@/hooks/use-notification-drawer-query";
import { measureExploreBoot } from "@/lib/web-vitals";
import {
  isExploreSessionShellEnabled,
  isUnifiedDiscoverNavEnabled,
} from "@/lib/site-config";
import { isExploreTvPrefetchAfterStableEnabled } from "@/lib/explore-feature-flags";
import {
  cancelExploreTvStablePrefetch,
  prefetchExploreTvSchedule,
  scheduleExploreTvPrefetchAfterStable,
  seedExploreTvPrefetch,
} from "@/lib/explore-tv-prefetch-cache";
import {
  type DiscoverNavIntent,
  type ExploreMainTab,
  expandDiscoverTabIntent,
  openPanelFromExpandedIntent,
  searchIntent,
} from "@/lib/discover-navigation-state";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-events";
import type { ExploreSsrBootPayload } from "@/lib/explore-ssr-boot";
import {
  buildExploreFeedHref,
  exploreFeedUrlStatesEqual,
  parseExploreFeedUrlState,
} from "@/lib/explore-url-feed-state";
import {
  exploreCurrentHref,
  exploreHrefsEqual,
  exploreLiveSearchParamsKey,
  exploreStateAheadOfUrl,
} from "@/lib/explore-url-sync-policy";
import { commitExploreHistory } from "@/lib/explore-url-history";
import {
  E2E_DISCOVER_CONTENTS,
  E2E_FEED_BOOT,
  E2E_JOINED_MEMBERSHIP,
  E2E_TV_HANDOFF,
} from "@/lib/e2e-explore-fixtures";
import {
  isExploreE2eFixturesEnabled,
  isExploreE2eFixturesEnvEnabled,
} from "@/lib/explore-e2e-fixtures-gate";
import { normalizeListPayload } from "@/lib/list-response-normalizer";
import {
  readDiscoverCatalogCache,
  writeDiscoverCatalogCache,
  isDiscoverCatalogStale,
  DISCOVER_LIVE_RAIL_STALE_MS,
  DISCOVER_DYNAMIC_RAIL_STALE_MS,
  type DiscoverCatalogSnapshot,
} from "@/lib/discover-catalog-cache";
import { stripDiscoverPanelParam } from "@/lib/discover-return.util";
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import { EXPLORE_EVENT_TYPE_OPTIONS } from "@/lib/event-type-options";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { pickContrastFgForHex } from "@/lib/pick-contrast-fg-for-bg";
import { useSideChick } from "@/components/community/side-chick-provider";
import { DedicatedExitConfirmDialog } from "@/components/community/dedicated-exit-confirm-dialog";
import { SideChickCommunityMenu } from "@/components/explore/explore-global-chrome";
import { InstallPromptSheet } from "@/components/pwa/install-prompt-sheet";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { useDedicatedExitGate } from "@/hooks/use-dedicated-exit-gate";
import { setPendingDedicatedEnter } from "@/lib/pending-dedicated-enter";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePusherTrackingGlobalTV } from "@/hooks/use-global-viewer-count";
import type { UserInfo } from "@/types/tracking.types";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ListFilterPlus, Lock, Plus, Search, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { Bars3BottomLeftIcon } from "@heroicons/react/24/outline";

import { NotificationBadge } from "@/components/notifications/notification-badge";
import { ExploreInstallPrompt } from "@/components/pwa/explore-install-prompt";
import { ExploreFeedSkeleton } from "@/components/explore/explore-feed-skeleton";

const ExploreFeedClient = dynamic(
  () => import("./explore-feed-client").then(m => m.ExploreFeedClient),
  {
    ssr: false,
    loading: () => <ExploreFeedSkeleton />,
  }
);
const ProfileDrawer = dynamic(() =>
  import("@/components/tv/profile-drawer").then(m => ({
    default: m.ProfileDrawer,
  }))
);
const DiscoverPanel = dynamic(() =>
  import("@/components/tv/discover-panel").then(m => ({
    default: m.DiscoverPanel,
  }))
);
const DiscoverSheet = dynamic(() =>
  import("./discover-sheet").then(m => ({
    default: m.DiscoverSheet,
  }))
);
const CommunityHubClient = dynamic(
  () => import("../community/community-hub-client")
);
const CommunityJoinPanel = dynamic(() =>
  import("../community/community-join-panel").then(m => ({
    default: m.CommunityJoinPanel,
  }))
);
const CreateDialog = dynamic(() =>
  import("../home/create-dialog").then(m => ({ default: m.CreateDialog }))
);

const EXPLORE_COMMUNITY_HUB_HREF = "/explore?tab=my-communities";

function exploreJoinHref(communityId: string) {
  return `/explore?tab=join&joinCommunity=${encodeURIComponent(communityId)}`;
}

type JoinedMembershipRow = {
  communityId: string;
  feedActive: boolean;
  membershipStatus: string;
  active: boolean;
  revokedAt: string | null;
  expiresAt: string | null;
  community?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    tvActivatedAt?: string | null;
    isSystem?: boolean;
  };
};

function isEligibleForCommunityFeedDropdown(m: JoinedMembershipRow): boolean {
  if (
    !m.active ||
    !m.feedActive ||
    m.membershipStatus !== "active" ||
    m.revokedAt
  ) {
    return false;
  }
  if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
  return true;
}

/** Hide Tipmanna Public / system global feed from the multi-select community picker. */
function isTipmannaPublicCommunityRow(m: JoinedMembershipRow): boolean {
  return isTipmannaSystemCommunity(
    m.communityId,
    m.community?.name,
    m.community?.isSystem
  );
}

function pickerVisibleCommunityIds(
  membershipIds: string[],
  memberships: JoinedMembershipRow[]
): string[] {
  const hidden = new Set(
    memberships.filter(isTipmannaPublicCommunityRow).map(m => m.communityId)
  );
  return membershipIds.filter(id => !hidden.has(id));
}

function initialFeedUrlStateFromKey(searchParamsKey: string) {
  return parseExploreFeedUrlState(new URLSearchParams(searchParamsKey));
}

export interface ExplorePageClientProps {
  characters?: any[];
  characterSets?: any[];
  ssrBoot?: ExploreSsrBootPayload | null;
}

function wouldLeaveDedicatedCommunitySelection(
  id: string,
  checked: boolean,
  multi: boolean,
  dedicatedId: string,
  currentIds: string[]
): boolean {
  let next: string[];
  if (multi) {
    next = checked
      ? currentIds.includes(id)
        ? currentIds
        : [...currentIds, id]
      : currentIds.filter(x => x !== id);
  } else if (checked) {
    next = [id];
  } else {
    next = currentIds.filter(x => x !== id);
  }
  if (next.length === 0) return true;
  return next.length !== 1 || next[0] !== dedicatedId;
}

export default function ExplorePageClient({
  characters: initialCharacters = [],
  characterSets: initialCharacterSets = [],
  ssrBoot = null,
}: ExplorePageClientProps) {
  const pathname = usePathname();
  const pathBase = pathname ?? "/explore";
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [historySyncGen, setHistorySyncGen] = useState(0);
  const liveSearchParamsKey = useMemo(() => {
    void historySyncGen;
    if (typeof window === "undefined") return searchParamsKey;
    return exploreLiveSearchParamsKey(searchParamsKey);
  }, [searchParamsKey, historySyncGen]);
  const liveUrlParams = useMemo(
    () => new URLSearchParams(liveSearchParamsKey),
    [liveSearchParamsKey]
  );
  const e2eTvSeed = liveUrlParams.get("e2eTv") === "1";
  const e2eFixtures = isExploreE2eFixturesEnabled(liveUrlParams);
  const tabParam = liveUrlParams.get("tab");
  const sideChick = useSideChick();
  const sideChickLocked =
    !sideChick.loading &&
    Boolean(sideChick.active && sideChick.activation?.communityId) &&
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";
  const dedicatedCommunityId = sideChick.activation?.communityId ?? null;
  const dedicatedCommunityName =
    sideChick.activation?.community.name ?? "Community";
  const { installed } = useInstallPrompt();
  const [activateInstallOpen, setActivateInstallOpen] = useState(false);
  const [activateDedicatedBusy, setActivateDedicatedBusy] = useState(false);

  const dedicatedExit = useDedicatedExitGate({
    sideChickLocked,
    dedicatedCommunityName,
    exitDedicatedMode: sideChick.exitDedicatedMode,
  });

  const [viewerUser] = useState<UserInfo>(() => getOrCreateAnonymousViewer());

  const { activeUsers: exploreLiveViewers } = usePusherTrackingGlobalTV({
    tvId: "global-tv",
    userInfo: viewerUser,
  });

  const [tab, setTab] = useState<ExploreMainTab>(
    tabParam === "discover"
      ? "discover"
      : tabParam === "community"
        ? "community"
        : tabParam === "my-communities"
          ? "my-communities"
          : tabParam === "join"
            ? "join"
            : "feed"
  );

  /**
   * Leaving Discover for Feed updates React state immediately, but history
   * replaceState clears `?tab=discover` one tick later. Until then, ignore stale URL→tab sync so we
   * do not snap back to Discover (which blocked Discover→reel `openInExplore`).
   */
  const leaveDiscoverForFeedRef = useRef(false);
  /** True after local tab change until URL query catches up (prevents stale tabParam reset). */
  const localTabNavRef = useRef(false);

  /** Unified Discover navigation + long-lived Explore session (default on; flags allow rollback). */
  const unifiedDiscoverNav = isUnifiedDiscoverNavEnabled();
  const sessionShellEnabled = isExploreSessionShellEnabled();

  const setMainTab = useCallback((next: ExploreMainTab) => {
    localTabNavRef.current = true;
    setTab(prev => {
      if (prev === "discover" && next === "feed") {
        leaveDiscoverForFeedRef.current = true;
      }
      return next;
    });
  }, []);

  const joinCommunityId = liveUrlParams.get("joinCommunity")?.trim() ?? "";
  const joinCommunityIdRef = useRef(joinCommunityId);
  joinCommunityIdRef.current = joinCommunityId;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    if (tab !== "join") return;
    if (!joinCommunityId) {
      setTab("my-communities");
      commitExploreHistory({
        href: EXPLORE_COMMUNITY_HUB_HREF,
        mode: "replace",
        source: "join-tab-guard",
      });
    }
  }, [tab, joinCommunityId]);

  useLayoutEffect(() => {
    if (ssrBoot?.items?.length) {
      seedExploreFeedBootFromSsr(ssrBoot);
    }
    measureExploreBoot();
  }, [ssrBoot]);

  useEffect(() => {
    if (tab === "feed") prefetchExploreFeedInitial();
  }, [tab]);

  const [characters, setCharacters] = useState<any[]>(initialCharacters);
  const [characterSets, setCharacterSets] =
    useState<any[]>(initialCharacterSets);
  const charactersLoadStartedRef = useRef(false);

  useEffect(() => {
    if (charactersLoadStartedRef.current) return;
    charactersLoadStartedRef.current = true;
    let cancelled = false;
    const loadCharacters = async () => {
      const [{ data: chars }, { data: sets }] = await Promise.all([
        getCharactersForTipping(),
        getAllCharacterSets(),
      ]);
      if (cancelled) return;
      setCharacters((chars as any[]) ?? []);
      setCharacterSets((sets as any[]) ?? []);
    };
    const schedule =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => void loadCharacters())
        : window.setTimeout(() => void loadCharacters(), 0);
    return () => {
      cancelled = true;
      if (typeof schedule === "number") {
        window.clearTimeout(schedule);
      } else if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(schedule);
      }
    };
  }, []);

  const headerPullRef = useRef<{ startY: number } | null>(null);

  const [contents, setContents] = useState<any[]>([]);
  const [latestContents, setLatestContents] = useState<any[]>([]);
  const [spotlightContents, setSpotlightContents] = useState<any[]>([]);
  const [recommendedContents, setRecommendedContents] = useState<any[]>([]);
  const [mostTippedContents, setMostTippedContents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<{
    upcoming: any[];
    live: any[];
    recentlyEnded: any[];
  }>({ upcoming: [], live: [], recentlyEnded: [] });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [discoverSheetOpen, setDiscoverSheetOpen] = useState(false);
  const discoverTabScrollRef = useRef<HTMLDivElement>(null);
  const discoverPanelRestoreRef = useRef(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState("");
  const catalogLoadedRef = useRef(false);
  const [discoverEvents, setDiscoverEvents] = useState<any[]>([]);
  const [topCommunities, setTopCommunities] = useState<
    CommunityExploreCatalogRow[]
  >([]);
  const [exploreCatalogAlphabetical, setExploreCatalogAlphabetical] = useState<
    CommunityExploreCatalogRow[]
  >([]);
  const [communityPickerCatalogLoading, setCommunityPickerCatalogLoading] =
    useState(false);
  const [topCommunitiesLoading, setTopCommunitiesLoading] = useState(false);
  const communityCatalogStatusRef = useRef<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const topCommunitiesStatusRef = useRef<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const communityCatalogLoadedRef = useRef(false);
  const [tippers, setTippers] = useState<any[]>([]);
  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileDrawerTab, setProfileDrawerTab] = useState<
    "notifications" | "reminders" | "saved" | "profile"
  >("notifications");
  const [notificationAccountTab, setNotificationAccountTab] = useState<
    "tipper" | "host"
  >("tipper");
  const {
    openDrawer: openNotificationDrawer,
    accountTab: notificationDrawerAccountTab,
    consumeParams: consumeNotificationDrawerParams,
  } = useNotificationDrawerQuery();

  useEffect(() => {
    if (!openNotificationDrawer) return;
    setProfileDrawerTab("notifications");
    setNotificationAccountTab(notificationDrawerAccountTab);
    setIsProfileDrawerOpen(true);
    consumeNotificationDrawerParams();
  }, [
    consumeNotificationDrawerParams,
    notificationDrawerAccountTab,
    openNotificationDrawer,
  ]);
  const [communityFeedSelIds, setCommunityFeedSelIds] = useState<string[]>(
    () => initialFeedUrlStateFromKey(searchParamsKey).communityFeedSelIds
  );
  const [joinedMemberships, setJoinedMemberships] = useState<
    JoinedMembershipRow[]
  >(() =>
    typeof window !== "undefined" &&
    isExploreE2eFixturesEnabled(new URLSearchParams(window.location.search))
      ? [E2E_JOINED_MEMBERSHIP]
      : []
  );
  const [hostTvCommunities, setHostTvCommunities] = useState<{
    owned: TvCommunityBrief[];
    coCreator: TvCommunityBrief[];
  }>({ owned: [], coCreator: [] });

  const exploreUserRole = useSelector((s: RootState) => s.auth.user?.role);
  const exploreAuthToken = useSelector((s: RootState) => s.auth.token);
  const isSignedInExplore =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    exploreUserRole === "TIPPER";
  const exploreUserId = useSelector((s: RootState) => s.auth.user?.id);

  useEffect(() => {
    if (!isSignedInExplore || !exploreUserId || !exploreAuthToken) {
      if (!e2eFixtures) {
        setJoinedMemberships([]);
        setHostTvCommunities({ owned: [], coCreator: [] });
      }
      return;
    }
    let cancelled = false;
    void (async () => {
      const hostPromise = getMyCommunitiesAction(exploreAuthToken);
      if (e2eFixtures) {
        if (!cancelled) {
          setJoinedMemberships([E2E_JOINED_MEMBERSHIP as JoinedMembershipRow]);
        }
      } else {
        const joinedRes = await getMeJoinedCommunitiesAction(exploreAuthToken);
        if (cancelled) return;
        const apiMemberships =
          joinedRes.success && Array.isArray(joinedRes.data?.memberships)
            ? (joinedRes.data.memberships as JoinedMembershipRow[])
            : [];
        setJoinedMemberships(apiMemberships);
      }
      const hostRes = await hostPromise;
      if (cancelled) return;
      if (hostRes?.success && hostRes.data) {
        const raw = hostRes.data as {
          owned?: TvCommunityBrief[];
          coCreator?: TvCommunityBrief[];
        };
        const owned = raw.owned ?? [];
        const coCreator = raw.coCreator ?? [];
        const showOwned = owned.length > 0 || coCreator.length > 0;
        setHostTvCommunities(
          showOwned ? { owned, coCreator } : { owned: [], coCreator: [] }
        );
      } else {
        setHostTvCommunities({ owned: [], coCreator: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    exploreAuthToken,
    exploreUserRole,
    isSignedInExplore,
    exploreUserId,
    e2eFixtures,
  ]);

  const eligibleCommunityIdsForPrefetch = useMemo(
    () =>
      joinedMemberships
        .filter(isEligibleForCommunityFeedDropdown)
        .map(m => m.communityId),
    [joinedMemberships]
  );

  const sideChickMenuRows = useMemo(
    () =>
      joinedMemberships
        .filter(isEligibleForCommunityFeedDropdown)
        .map(m => ({ communityId: m.communityId, community: m.community })),
    [joinedMemberships]
  );

  const [feedSubTab, setFeedSubTab] = useState<
    "trends" | "saves" | "tv" | "community"
  >(() => initialFeedUrlStateFromKey(searchParamsKey).feedSubTab);
  /** Tipmanna global guide vs a joined community (schedule data unchanged until Phase 8). */
  const [tvExploreSource, setTvExploreSource] = useState<"tipmanna" | string>(
    () => initialFeedUrlStateFromKey(searchParamsKey).tvExploreSource
  );
  const exploreFeedRef = useRef<ExploreFeedClientHandle>(null);
  /** Discover → Feed: defer reel open until Feed panel is visible (fixes playbackActive=false + 0 slide height). */
  const pendingExploreOpenRef = useRef<ExploreFeedOpenTarget | null>(null);
  const [exploreOpenNonce, setExploreOpenNonce] = useState(0);

  const [trendEventTypes, setTrendEventTypes] = useState<string[]>(
    () => initialFeedUrlStateFromKey(searchParamsKey).trendEventTypes
  );
  const [trendLanguage, setTrendLanguage] = useState(
    () => initialFeedUrlStateFromKey(searchParamsKey).trendLanguage
  );
  const [trendCountry, setTrendCountry] = useState(
    () => initialFeedUrlStateFromKey(searchParamsKey).trendCountry
  );
  const [includeEndedLive, setIncludeEndedLive] = useState(
    () => initialFeedUrlStateFromKey(searchParamsKey).includeEndedLive
  );

  useLayoutEffect(() => {
    if (!e2eFixtures) return;
    seedExploreFeedBootFromSsr(E2E_FEED_BOOT);
    seedExploreE2eSavesBoot(E2E_FEED_BOOT);
    setJoinedMemberships([E2E_JOINED_MEMBERSHIP]);
    setContents(E2E_DISCOVER_CONTENTS);
    setLatestContents(E2E_DISCOVER_CONTENTS);
    setSpotlightContents(E2E_DISCOVER_CONTENTS);
    catalogLoadedRef.current = true;
    if (e2eTvSeed) {
      seedExploreTvPrefetch({
        ongoing: [
          {
            channel: E2E_TV_HANDOFF.currentProgramme.channel,
            startsAt: E2E_TV_HANDOFF.currentProgramme.startsAt,
            endsAt: E2E_TV_HANDOFF.currentProgramme.endsAt,
          },
        ],
        upcoming: [
          {
            channel: E2E_TV_HANDOFF.nextProgramme.channel,
            startsAt: E2E_TV_HANDOFF.nextProgramme.startsAt,
            endsAt: E2E_TV_HANDOFF.nextProgramme.endsAt,
          },
        ],
        ongoingLabel: "On air now",
        upcomingLabel: "Next 12 hours",
      });
    }
  }, [e2eFixtures, e2eTvSeed]);

  useEffect(() => {
    if (tab !== "feed") return;
    scheduleExploreFeedPrefetchIdle({
      communityIds: eligibleCommunityIdsForPrefetch,
      tvSource: tvExploreSource,
      tvFilters: {
        eventVideoTypes: trendEventTypes,
        language: trendLanguage,
        country: trendCountry,
      },
    });
  }, [
    tab,
    eligibleCommunityIdsForPrefetch,
    tvExploreSource,
    trendEventTypes,
    trendLanguage,
    trendCountry,
  ]);

  useEffect(() => {
    if (tab !== "feed") {
      cancelExploreTvStablePrefetch();
      return;
    }
    if (!isExploreTvPrefetchAfterStableEnabled()) {
      return;
    }
    scheduleExploreTvPrefetchAfterStable({
      tvSource: tvExploreSource,
      eventVideoTypes: trendEventTypes,
      language: trendLanguage,
      country: trendCountry,
    });
    return () => cancelExploreTvStablePrefetch();
  }, [tab, tvExploreSource, trendEventTypes, trendLanguage, trendCountry]);

  useEffect(() => {
    const onAuthChanged = () => {
      prefetchExploreSavesFeed();
      if (eligibleCommunityIdsForPrefetch.length) {
        prefetchExploreCommunityFeed(eligibleCommunityIdsForPrefetch);
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [eligibleCommunityIdsForPrefetch]);

  const prefetchTvSchedule = useCallback(() => {
    prefetchExploreTvSchedule({
      tvSource: tvExploreSource,
      eventVideoTypes: trendEventTypes,
      language: trendLanguage,
      country: trendCountry,
    });
  }, [tvExploreSource, trendEventTypes, trendLanguage, trendCountry]);

  const communityPickerMultiRef = useRef(false);
  const lastHandledVideoHandoffKeyRef = useRef<string | null>(null);
  const feedUrlStateRef = useRef({
    trendEventTypes,
    trendLanguage,
    trendCountry,
    feedSubTab,
    tvExploreSource,
    communityFeedSelIds,
    includeEndedLive,
  });
  feedUrlStateRef.current = {
    trendEventTypes,
    trendLanguage,
    trendCountry,
    feedSubTab,
    tvExploreSource,
    communityFeedSelIds,
    includeEndedLive,
  };

  useEffect(() => {
    if (tabParam !== "discover") {
      leaveDiscoverForFeedRef.current = false;
    }

    const fromUrl: ExploreMainTab =
      tabParam === "discover"
        ? "discover"
        : tabParam === "community"
          ? "community"
          : tabParam === "my-communities"
            ? "my-communities"
            : tabParam === "join"
              ? "join"
              : "feed";

    if (localTabNavRef.current) {
      // External join links must apply even while a feed-local nav guard is active.
      if (tabParam === "join" && joinCommunityId) {
        setTab("join");
      }
      return;
    }

    setTab(prev => {
      if (leaveDiscoverForFeedRef.current && tabParam === "discover") {
        return prev;
      }
      return fromUrl;
    });
  }, [tabParam, tab, pathBase, joinCommunityId, searchParamsKey]);

  /** Latest query string for merge-only reads — omit from URL-push effect deps. */
  const searchParamsKeyRef = useRef(searchParamsKey);
  searchParamsKeyRef.current = searchParamsKey;

  /** Monotonic id reserved for future generation guards (history-only commits). */
  type ExploreUrlCommitSource =
    | "feed-subtab-click"
    | "main-tab-click"
    | "filter-change"
    | "filter-lang-change"
    | "filter-country-change"
    | "community-selection"
    | "discover-expand"
    | "passive-sync";

  const commitExploreUrl = useCallback(
    (
      source: ExploreUrlCommitSource,
      tabCtx: { tab: ExploreMainTab; joinCommunityId?: string },
      feedState: typeof feedUrlStateRef.current,
      mode: "push" | "replace" = "push"
    ) => {
      const liveSearchKey = exploreLiveSearchParamsKey(
        searchParamsKeyRef.current
      );
      const nextHref = buildExploreFeedHref(
        pathBase,
        tabCtx,
        feedState,
        liveSearchKey
      );
      commitExploreHistory({ href: nextHref, mode, source });
    },
    [pathBase]
  );

  const stripDiscoverPanelFromUrl = useCallback(() => {
    const liveKey = exploreLiveSearchParamsKey(searchParamsKeyRef.current);
    const stripped = stripDiscoverPanelParam(liveKey);
    if (stripped === liveKey) return;
    const nextHref = buildExploreFeedHref(
      pathBase,
      { tab, joinCommunityId: joinCommunityIdRef.current },
      feedUrlStateRef.current,
      stripped
    );
    commitExploreHistory({
      href: nextHref,
      mode: "replace",
      source: "passive-sync",
    });
    setHistorySyncGen(g => g + 1);
  }, [pathBase, tab]);

  const closeDiscoverSheet = useCallback(() => {
    setDiscoverSheetOpen(false);
    stripDiscoverPanelFromUrl();
  }, [stripDiscoverPanelFromUrl]);

  const navigateFeedSubTab = useCallback(
    (sub: "trends" | "saves" | "tv" | "community") => {
      localTabNavRef.current = true;
      setMainTab("feed");
      setFeedSubTab(sub);
      feedUrlStateRef.current = {
        ...feedUrlStateRef.current,
        feedSubTab: sub,
      };
      commitExploreUrl(
        "feed-subtab-click",
        { tab: "feed", joinCommunityId: joinCommunityIdRef.current },
        feedUrlStateRef.current
      );
    },
    [commitExploreUrl, setMainTab]
  );

  const navigateMainTab = useCallback(
    (nextTab: ExploreMainTab) => {
      localTabNavRef.current = true;
      setMainTab(nextTab);
      commitExploreUrl(
        "main-tab-click",
        {
          tab: nextTab,
          joinCommunityId:
            nextTab === "join" ? joinCommunityIdRef.current : undefined,
        },
        feedUrlStateRef.current
      );
    },
    [commitExploreUrl, setMainTab]
  );

  /** Clear local navigation guard once the browser URL matches React state. */
  useEffect(() => {
    if (!localTabNavRef.current) return;
    if (
      !exploreStateAheadOfUrl(
        pathBase,
        { tab, joinCommunityId },
        feedUrlStateRef.current,
        searchParamsKey
      )
    ) {
      localTabNavRef.current = false;
    }
  }, [
    searchParamsKey,
    tab,
    joinCommunityId,
    pathBase,
    feedSubTab,
    trendEventTypes,
    trendLanguage,
    trendCountry,
    tvExploreSource,
    communityFeedSelIds,
    includeEndedLive,
  ]);

  useEffect(() => {
    const onPopState = () => {
      localTabNavRef.current = false;
      leaveDiscoverForFeedRef.current = false;
      setHistorySyncGen(g => g + 1);
      if (typeof window !== "undefined") {
        const poppedTab = new URLSearchParams(window.location.search).get(
          "tab"
        );
        const fromUrl: ExploreMainTab =
          poppedTab === "discover"
            ? "discover"
            : poppedTab === "community"
              ? "community"
              : poppedTab === "my-communities"
                ? "my-communities"
                : poppedTab === "join"
                  ? "join"
                  : "feed";
        setTab(fromUrl);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /** Restore feed shell state from URL on every navigation (back/forward/deep link). */
  useLayoutEffect(() => {
    const parsed = parseExploreFeedUrlState(
      new URLSearchParams(liveSearchParamsKey)
    );
    if (sideChickLocked && dedicatedCommunityId) {
      parsed.communityFeedSelIds = [dedicatedCommunityId];
      parsed.tvExploreSource = dedicatedCommunityId;
    }

    if (localTabNavRef.current) {
      return;
    }

    if (exploreFeedUrlStatesEqual(feedUrlStateRef.current, parsed)) return;
    setTrendEventTypes(parsed.trendEventTypes);
    setTrendLanguage(parsed.trendLanguage);
    setTrendCountry(parsed.trendCountry);
    setFeedSubTab(parsed.feedSubTab);
    setTvExploreSource(parsed.tvExploreSource);
    setCommunityFeedSelIds(parsed.communityFeedSelIds);
    setIncludeEndedLive(parsed.includeEndedLive);
  }, [
    liveSearchParamsKey,
    historySyncGen,
    sideChickLocked,
    dedicatedCommunityId,
    pathBase,
    tab,
    joinCommunityId,
  ]);

  /** Passive URL normalization only — explicit user navigation owns push commits. */
  useEffect(() => {
    if (localTabNavRef.current) return;

    const liveKey = exploreLiveSearchParamsKey(searchParamsKeyRef.current);
    const nextHref = buildExploreFeedHref(
      pathBase,
      { tab, joinCommunityId },
      feedUrlStateRef.current,
      liveKey
    );
    const curHref = exploreCurrentHref(pathBase, liveKey);
    if (exploreHrefsEqual(nextHref, curHref)) return;

    if (
      exploreStateAheadOfUrl(
        pathBase,
        { tab, joinCommunityId },
        feedUrlStateRef.current,
        liveKey
      )
    ) {
      return;
    }

    commitExploreUrl(
      "passive-sync",
      { tab, joinCommunityId },
      feedUrlStateRef.current,
      "replace"
    );
  }, [
    trendEventTypes,
    trendLanguage,
    trendCountry,
    feedSubTab,
    tvExploreSource,
    communityFeedSelIds,
    includeEndedLive,
    pathBase,
    tab,
    joinCommunityId,
    searchParamsKey,
    commitExploreUrl,
  ]);

  useEffect(() => {
    if (!sideChickLocked || !dedicatedCommunityId) return;
    setCommunityFeedSelIds([dedicatedCommunityId]);
    setTvExploreSource(dedicatedCommunityId);
  }, [sideChickLocked, dedicatedCommunityId]);

  useEffect(() => {
    if (feedSubTab !== "community") return;
    if (sideChickLocked) return;
    if (e2eFixtures) return;
    if (communityFeedSelIds.length > 0) return;
    const eligible = joinedMemberships.filter(
      isEligibleForCommunityFeedDropdown
    );
    const ids = eligible
      .filter(m => !isTipmannaPublicCommunityRow(m))
      .map(m => m.communityId);
    if (ids.length) setCommunityFeedSelIds(ids);
  }, [
    feedSubTab,
    joinedMemberships,
    communityFeedSelIds.length,
    sideChickLocked,
    e2eFixtures,
  ]);

  const tvExploreFilters = useMemo(
    () => ({
      eventVideoTypes: trendEventTypes,
      language: trendLanguage,
      country: trendCountry,
    }),
    [trendEventTypes, trendLanguage, trendCountry]
  );

  const trendsFilters = useMemo(
    () => ({
      eventTypes: trendEventTypes,
      language: trendLanguage,
      country: trendCountry,
      includeEndedLive,
    }),
    [trendEventTypes, trendLanguage, trendCountry, includeEndedLive]
  );

  const scopedExploreCommunityIds = useMemo(() => {
    if (sideChickLocked && dedicatedCommunityId) {
      return [dedicatedCommunityId];
    }
    const visible = pickerVisibleCommunityIds(
      communityFeedSelIds,
      joinedMemberships
    );
    if (feedSubTab === "community") {
      return visible;
    }
    if (visible.length > 0) {
      return visible;
    }
    return undefined;
  }, [
    sideChickLocked,
    dedicatedCommunityId,
    feedSubTab,
    communityFeedSelIds,
    joinedMemberships,
  ]);

  const reelsKey = useMemo(() => {
    if (feedSubTab === "saves") return "saves";
    if (feedSubTab === "community") {
      const ids = scopedExploreCommunityIds ?? [];
      return `community-${[...ids].sort().join("|")}`;
    }
    if (
      scopedExploreCommunityIds?.length &&
      sideChickLocked &&
      dedicatedCommunityId
    ) {
      return `trends-${[...scopedExploreCommunityIds].sort().join("|")}`;
    }
    return "trends";
  }, [
    feedSubTab,
    scopedExploreCommunityIds,
    sideChickLocked,
    dedicatedCommunityId,
  ]);

  const [suppressDiscoverInlineContentId, setSuppressDiscoverInlineContentId] =
    useState<string | null>(null);

  useEffect(() => {
    if (tab === "discover") {
      setSuppressDiscoverInlineContentId(null);
    }
  }, [tab]);

  const commitFilterExploreUrl = useCallback(
    (
      source: Extract<
        ExploreUrlCommitSource,
        "filter-change" | "filter-lang-change" | "filter-country-change"
      >,
      nextFeedState: typeof feedUrlStateRef.current,
      applyState: () => void
    ) => {
      localTabNavRef.current = true;
      setMainTab("feed");
      feedUrlStateRef.current = nextFeedState;
      applyState();

      const tabCtx = {
        tab: "feed" as const,
        joinCommunityId: joinCommunityIdRef.current,
      };

      commitExploreUrl(source, tabCtx, nextFeedState);
    },
    [commitExploreUrl, setMainTab]
  );

  const toggleTrendEventType = useCallback(
    (value: string) => {
      const prev = feedUrlStateRef.current.trendEventTypes;
      const next = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value];
      const nextFeedState = {
        ...feedUrlStateRef.current,
        trendEventTypes: next,
      };
      commitFilterExploreUrl("filter-change", nextFeedState, () =>
        setTrendEventTypes(next)
      );
    },
    [commitFilterExploreUrl]
  );

  const setTrendLanguageWithUrl = useCallback(
    (value: string) => {
      const nextFeedState = {
        ...feedUrlStateRef.current,
        trendLanguage: value,
      };
      commitFilterExploreUrl("filter-lang-change", nextFeedState, () =>
        setTrendLanguage(value)
      );
    },
    [commitFilterExploreUrl]
  );

  const setTrendCountryWithUrl = useCallback(
    (value: string) => {
      const nextFeedState = {
        ...feedUrlStateRef.current,
        trendCountry: value,
      };
      commitFilterExploreUrl("filter-country-change", nextFeedState, () =>
        setTrendCountry(value)
      );
    },
    [commitFilterExploreUrl]
  );

  const toggleIncludeEndedLive = useCallback(
    (checked: boolean) => {
      const nextFeedState = {
        ...feedUrlStateRef.current,
        includeEndedLive: checked,
      };
      commitFilterExploreUrl("filter-change", nextFeedState, () =>
        setIncludeEndedLive(checked)
      );
    },
    [commitFilterExploreUrl]
  );

  const handlePlayInExplore = useCallback(
    (target: ExploreFeedOpenTarget) => {
      lastHandledVideoHandoffKeyRef.current = handoffKeyForTarget(target);
      pendingExploreOpenRef.current = target;
      setSuppressDiscoverInlineContentId(target.videoId);
      warmExploreVideoHandoff(target);
      setDiscoverSheetOpen(false);

      localTabNavRef.current = true;
      setMainTab("feed");
      setFeedSubTab("trends");
      feedUrlStateRef.current = {
        ...feedUrlStateRef.current,
        feedSubTab: "trends",
      };

      const handoffHref = buildExploreVideoHandoffHref(
        target,
        searchParamsKeyRef.current
      );
      commitExploreHistory({
        href: handoffHref,
        mode: "push",
        source: "discover-expand",
      });
      setHistorySyncGen(g => g + 1);

      const client = exploreFeedRef.current;
      if (client) {
        pendingExploreOpenRef.current = null;
        clearExplorePendingHandoff();
        void client.openInExplore(target);
        return;
      }
      setExploreOpenNonce(n => n + 1);
    },
    [setMainTab]
  );

  useLayoutEffect(() => {
    const liveKey = exploreLiveSearchParamsKey(searchParamsKey);
    const sp = new URLSearchParams(liveKey);

    const urlTarget = exploreOpenTargetFromUrl(sp);
    const pending = readExplorePendingHandoff();
    const target = mergeExploreHandoffTargets(urlTarget, pending);

    if (!target) {
      lastHandledVideoHandoffKeyRef.current = null;
      return;
    }

    const handoffKey = handoffKeyForTarget(target);
    if (handoffKey === lastHandledVideoHandoffKeyRef.current) {
      void exploreFeedRef.current?.openInExplore(target);
      return;
    }

    lastHandledVideoHandoffKeyRef.current = handoffKey;
    clearExplorePendingHandoff();
    handlePlayInExplore(target);
  }, [searchParamsKey, handlePlayInExplore, historySyncGen]);

  /** Runs after Feed subtree commits so refs/layout exist; restores pending target if aborted before open (Strict Mode / cancel). */
  useLayoutEffect(() => {
    if (tab !== "feed" && tab !== "community") return;
    // Discovery handoffs always target the Trends reel; wait until TV chrome is hidden.
    if (feedSubTab === "tv") return;
    const target = pendingExploreOpenRef.current;
    if (!target) return;
    pendingExploreOpenRef.current = null;

    let alive = true;
    let opened = false;
    let raf = 0;

    const kick = () => {
      if (!alive || opened) return;
      const client = exploreFeedRef.current;
      if (client) {
        opened = true;
        void client.openInExplore(target);
        return;
      }
      raf = requestAnimationFrame(kick);
    };

    kick();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (!opened) {
        pendingExploreOpenRef.current = target;
      }
    };
  }, [tab, feedSubTab, exploreOpenNonce]);

  const loadTopCommunities = useCallback(async () => {
    if (e2eFixtures) return;
    if (
      topCommunitiesStatusRef.current === "loading" ||
      topCommunitiesStatusRef.current === "loaded"
    ) {
      return;
    }
    topCommunitiesStatusRef.current = "loading";
    setTopCommunitiesLoading(true);
    try {
      const res = await getTopCommunitiesAction(3);
      if (res.success && res.data) {
        setTopCommunities(
          Array.isArray(res.data.communities) ? res.data.communities : []
        );
        topCommunitiesStatusRef.current = "loaded";
      } else {
        topCommunitiesStatusRef.current = "error";
      }
    } catch {
      topCommunitiesStatusRef.current = "error";
    } finally {
      setTopCommunitiesLoading(false);
    }
  }, [e2eFixtures]);

  const loadCommunityCatalogForPicker = useCallback(async () => {
    if (e2eFixtures) return;
    if (
      communityCatalogStatusRef.current === "loading" ||
      communityCatalogStatusRef.current === "loaded"
    ) {
      return;
    }
    communityCatalogStatusRef.current = "loading";
    setCommunityPickerCatalogLoading(true);
    try {
      const commRes = await getCommunityExploreCatalogAction();
      if (commRes.success && commRes.data) {
        setExploreCatalogAlphabetical(
          Array.isArray(commRes.data.alphabetical)
            ? commRes.data.alphabetical
            : []
        );
        communityCatalogStatusRef.current = "loaded";
        communityCatalogLoadedRef.current = true;
      } else {
        communityCatalogStatusRef.current = "error";
      }
    } catch {
      communityCatalogStatusRef.current = "error";
    } finally {
      setCommunityPickerCatalogLoading(false);
    }
  }, [e2eFixtures]);

  useEffect(() => {
    if (tab !== "feed" || e2eFixtures) return;
    void loadTopCommunities();
  }, [tab, e2eFixtures, loadTopCommunities]);

  const applyCatalogSnapshot = useCallback(
    (snapshot: DiscoverCatalogSnapshot) => {
      setContents(snapshot.contents);
      setLatestContents(snapshot.latestContents);
      setSpotlightContents(snapshot.spotlightContents);
      setRecommendedContents(snapshot.recommendedContents);
      setMostTippedContents(snapshot.mostTippedContents);
      setLiveStreams(snapshot.liveStreams);
      setPrograms(snapshot.programs);
      setPlaylists(snapshot.playlists);
      setTippers(snapshot.tippers);
      setTopCommunities(
        snapshot.topCommunities as CommunityExploreCatalogRow[]
      );
      setDiscoverEvents(snapshot.discoverEvents as any[]);
    },
    []
  );

  const loadExploreCatalog = useCallback(
    async (options?: { background?: boolean }) => {
      if (e2eFixtures) {
        setCatalogLoading(false);
        return;
      }
      const background = options?.background === true;
      if (background) {
        setCatalogRefreshing(true);
      } else {
        setCatalogLoading(true);
      }
      try {
        const signedIn = isSignedInExplore && Boolean(exploreUserId?.trim());
        const [
          feat,
          lat,
          spot,
          rec,
          most,
          liveRes,
          progRes,
          tipRes,
          tipEv,
          iTip,
          causesRes,
          topCommRes,
          commRes,
          plRes,
          eventsRes,
        ] = await Promise.all([
          getAllFeaturedContentsAction(),
          getDiscoverPanelLatestContents(),
          getSpotlightContents(),
          getRecommendedContents(),
          getMostTippedContents(),
          getLiveStreamContents(),
          getDiscoveryProgramsAction(),
          getAllTopTippers(),
          signedIn
            ? getTippedEventsForTipper()
            : Promise.resolve({ success: true, data: [] as any[] }),
          signedIn
            ? getTotalAmountTippedByTipper()
            : Promise.resolve({ success: true, data: 0 }),
          getAllCausesAction(),
          getTopCommunitiesAction(3),
          getCommunityExploreCatalogAction(),
          getDiscoveryPlaylistsAction(20),
          getDiscoveryEventsAction(),
        ]);

        const nextContents = feat.success
          ? normalizeListPayload<any>(feat.data)
          : [];
        const nextLatest = lat.success
          ? normalizeListPayload<any>(lat.data)
          : [];
        const nextSpotlight = spot.success
          ? normalizeListPayload<any>(spot.data)
          : [];
        const nextRecommended = rec.success
          ? normalizeListPayload<any>(rec.data)
          : [];
        const nextMostTipped = most.success
          ? normalizeListPayload<any>(most.data)
          : [];
        let nextLiveStreams = {
          upcoming: [] as any[],
          live: [] as any[],
          recentlyEnded: [] as any[],
        };
        if (
          liveRes.success &&
          liveRes.data &&
          typeof liveRes.data === "object"
        ) {
          const ls = liveRes.data as {
            upcoming?: any[];
            live?: any[];
            recentlyEnded?: any[];
          };
          nextLiveStreams = {
            upcoming: Array.isArray(ls.upcoming) ? ls.upcoming : [],
            live: Array.isArray(ls.live) ? ls.live : [],
            recentlyEnded: Array.isArray(ls.recentlyEnded)
              ? ls.recentlyEnded
              : [],
          };
        }
        const nextPrograms = progRes.success
          ? takeRecentDiscoveryPrograms(normalizeListPayload<any>(progRes.data))
          : [];
        const nextPlaylists =
          plRes.success && Array.isArray(plRes.data) ? plRes.data : [];
        const nextTippers = tipRes.success
          ? normalizeListPayload<any>(tipRes.data)
          : [];
        const nextTopCommunities =
          topCommRes.success && Array.isArray(topCommRes.data?.communities)
            ? topCommRes.data.communities
            : [];
        const nextDiscoverEvents =
          eventsRes.success && Array.isArray(eventsRes.data)
            ? eventsRes.data
            : [];

        setContents(nextContents);
        setLatestContents(nextLatest);
        setSpotlightContents(nextSpotlight);
        setRecommendedContents(nextRecommended);
        setMostTippedContents(nextMostTipped);
        setLiveStreams(nextLiveStreams);
        setPrograms(nextPrograms);
        setPlaylists(nextPlaylists);
        setTippers(nextTippers);
        setTipperEvents(
          tipEv.success && Array.isArray(tipEv.data) ? tipEv.data : []
        );
        setITipped(
          typeof iTip.data === "number" ? iTip.data : Number(iTip.data) || 0
        );
        setCauses(
          causesRes.success && Array.isArray(causesRes.data)
            ? causesRes.data
            : []
        );
        setTopCommunities(nextTopCommunities);
        setDiscoverEvents(nextDiscoverEvents);
        topCommunitiesStatusRef.current = "loaded";
        setExploreCatalogAlphabetical(
          commRes.success && Array.isArray(commRes.data?.alphabetical)
            ? commRes.data.alphabetical
            : []
        );
        communityCatalogLoadedRef.current = true;

        writeDiscoverCatalogCache({
          contents: nextContents,
          latestContents: nextLatest,
          spotlightContents: nextSpotlight,
          recommendedContents: nextRecommended,
          mostTippedContents: nextMostTipped,
          liveStreams: nextLiveStreams,
          programs: nextPrograms,
          playlists: nextPlaylists,
          tippers: nextTippers,
          topCommunities: nextTopCommunities,
          discoverEvents: nextDiscoverEvents,
        });
        catalogLoadedRef.current = true;
      } finally {
        setCatalogLoading(false);
        setCatalogRefreshing(false);
      }
    },
    [e2eFixtures, isSignedInExplore, exploreUserId]
  );

  const openDiscoverSheet = useCallback(() => {
    setDiscoverSheetOpen(true);
    prefetchExploreFeedInitial();
    const cached = readDiscoverCatalogCache();
    if (cached) {
      applyCatalogSnapshot(cached);
      setCatalogLoading(false);
      if (isDiscoverCatalogStale(cached, DISCOVER_LIVE_RAIL_STALE_MS)) {
        void loadExploreCatalog({ background: true });
      }
      return;
    }
    void loadExploreCatalog();
  }, [applyCatalogSnapshot, loadExploreCatalog]);

  useEffect(() => {
    const sp = new URLSearchParams(searchParamsKey);
    if (sp.get("discoverPanel") !== "1") {
      discoverPanelRestoreRef.current = false;
      return;
    }
    openDiscoverSheet();
    if (!discoverPanelRestoreRef.current) {
      discoverPanelRestoreRef.current = true;
      stripDiscoverPanelFromUrl();
    }
  }, [searchParamsKey, openDiscoverSheet, stripDiscoverPanelFromUrl]);

  /**
   * Applies a declarative {@link DiscoverNavIntent} (from discover-navigation-state)
   * to React state. Centralizing the rules there keeps the panel/tab/search
   * surfaces in sync from a single navigation model.
   */
  const applyDiscoverNavIntent = useCallback(
    (intent: DiscoverNavIntent) => {
      if (intent.searchTerm !== undefined)
        setDiscoverSearchTerm(intent.searchTerm);
      if (intent.tab) navigateMainTab(intent.tab);
      if (intent.closePanel) closeDiscoverSheet();
      else if (intent.openPanel) openDiscoverSheet();
    },
    [closeDiscoverSheet, navigateMainTab, openDiscoverSheet]
  );

  const expandDiscoverFromPanel = useCallback(() => {
    applyDiscoverNavIntent(expandDiscoverTabIntent());
  }, [applyDiscoverNavIntent]);

  /**
   * Unified Discover navigation: Search opens the quick panel over the feed and
   * never switches the user to the full Discover tab. With the flag off, legacy
   * behavior (expand to Discover tab + open sheet) is preserved.
   */
  const openDiscoverSheetWithTerm = useCallback(
    (term?: string) => {
      applyDiscoverNavIntent(
        searchIntent(term ?? headerSearch, unifiedDiscoverNav)
      );
    },
    [applyDiscoverNavIntent, headerSearch, unifiedDiscoverNav]
  );

  const openDiscoverSheetWithSearch = useCallback(() => {
    openDiscoverSheetWithTerm(headerSearch);
  }, [headerSearch, openDiscoverSheetWithTerm]);

  useEffect(() => {
    if (tab !== "discover" && !discoverSheetOpen) return;
    const cached = readDiscoverCatalogCache();
    if (cached) {
      applyCatalogSnapshot(cached);
      setCatalogLoading(false);
      if (isDiscoverCatalogStale(cached)) {
        void loadExploreCatalog({ background: true });
      }
      return;
    }
    if (catalogLoadedRef.current) return;
    void loadExploreCatalog();
  }, [tab, discoverSheetOpen, loadExploreCatalog, applyCatalogSnapshot]);

  useEffect(() => {
    if (tab !== "feed" || e2eFixtures) return;
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 1500);
    const cancel =
      typeof window.cancelIdleCallback === "function"
        ? window.cancelIdleCallback
        : window.clearTimeout;
    const handle = idle(() => {
      if (readDiscoverCatalogCache()) return;
      void loadExploreCatalog({ background: true });
    });
    return () => cancel(handle as number);
  }, [tab, e2eFixtures, loadExploreCatalog]);

  const visibleCommunityFeedSelIds = useMemo(
    () => pickerVisibleCommunityIds(communityFeedSelIds, joinedMemberships),
    [communityFeedSelIds, joinedMemberships]
  );

  const eligibleCommunityPickerRows = useMemo(
    () =>
      joinedMemberships
        .filter(isEligibleForCommunityFeedDropdown)
        .filter(m => !isTipmannaPublicCommunityRow(m)),
    [joinedMemberships]
  );

  const tvCommunitySelectOptions = useMemo(
    () =>
      buildTvPickerOptionsForUser({
        memberships: joinedMemberships,
        owned: hostTvCommunities.owned,
        coCreator: hostTvCommunities.coCreator,
      }),
    [hostTvCommunities.coCreator, hostTvCommunities.owned, joinedMemberships]
  );

  const onCommunityFeedPick = useCallback(
    (id: string, checked: boolean, multi: boolean) => {
      const applyPick = () => {
        const prev = feedUrlStateRef.current.communityFeedSelIds;
        let next: string[];
        if (multi) {
          next = checked
            ? prev.includes(id)
              ? prev
              : [...prev, id]
            : prev.filter(x => x !== id);
        } else if (checked) {
          next = [id];
        } else {
          next = prev.filter(x => x !== id);
        }
        if (next.length) prefetchExploreCommunityFeed(next);
        localTabNavRef.current = true;
        setMainTab("feed");
        setFeedSubTab("community");
        setCommunityFeedSelIds(next);
        const nextFeedState = {
          ...feedUrlStateRef.current,
          feedSubTab: "community" as const,
          communityFeedSelIds: next,
        };
        feedUrlStateRef.current = nextFeedState;
        commitExploreUrl(
          "community-selection",
          { tab: "feed", joinCommunityId: joinCommunityIdRef.current },
          nextFeedState
        );
      };

      if (
        sideChickLocked &&
        dedicatedCommunityId &&
        wouldLeaveDedicatedCommunitySelection(
          id,
          checked,
          multi,
          dedicatedCommunityId,
          feedUrlStateRef.current.communityFeedSelIds
        )
      ) {
        dedicatedExit.requestExitThen(applyPick);
        return;
      }
      applyPick();
    },
    [
      commitExploreUrl,
      setMainTab,
      sideChickLocked,
      dedicatedCommunityId,
      dedicatedExit.requestExitThen,
    ]
  );

  const onTvExploreSourceChange = useCallback(
    (next: "tipmanna" | string) => {
      const apply = () => setTvExploreSource(next);
      if (
        sideChickLocked &&
        dedicatedCommunityId &&
        next !== dedicatedCommunityId
      ) {
        dedicatedExit.requestExitThen(apply);
        return;
      }
      apply();
    },
    [sideChickLocked, dedicatedCommunityId, dedicatedExit.requestExitThen]
  );

  const activateDedicatedCandidate = useMemo(() => {
    if (sideChickLocked || sideChick.loading) return null;
    const eligible = joinedMemberships
      .filter(isEligibleForCommunityFeedDropdown)
      .filter(m => !isTipmannaPublicCommunityRow(m));
    if (eligible.length !== 1) return null;
    return eligible[0] ?? null;
  }, [joinedMemberships, sideChick.loading, sideChickLocked]);

  const handleActivateDedicatedMode = useCallback(async () => {
    const candidate = activateDedicatedCandidate;
    if (!candidate || !exploreAuthToken) return;
    if (!installed) {
      setPendingDedicatedEnter(candidate.communityId);
      setActivateInstallOpen(true);
      return;
    }
    setActivateDedicatedBusy(true);
    try {
      const ok = await sideChick.enterDedicatedMode(candidate.communityId);
      if (ok) {
        window.location.reload();
      } else {
        toast.error("Could not activate dedicated mode");
      }
    } finally {
      setActivateDedicatedBusy(false);
    }
  }, [activateDedicatedCandidate, exploreAuthToken, installed, sideChick]);

  useEffect(() => {
    if (sideChickLocked) return;
    if (tvExploreSource === "tipmanna") return;
    if (tvCommunitySelectOptions.some(o => o.id === tvExploreSource)) return;
    setTvExploreSource("tipmanna");
  }, [tvCommunitySelectOptions, tvExploreSource, sideChickLocked]);

  const communityFeatureEnabled =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";

  const headerTint =
    communityFeatureEnabled &&
    sideChickLocked &&
    sideChick.activation?.customization?.headerColor
      ? sideChick.activation.customization.headerColor
      : null;

  const headerContrast = useMemo(
    () => (headerTint ? pickContrastFgForHex(headerTint) : null),
    [headerTint]
  );

  const sideChickPillActive =
    "bg-amber-400 font-medium text-neutral-950 shadow-sm ring-1 ring-amber-600/35";

  const feedChromeTabActive =
    tab === "feed" &&
    (feedSubTab === "trends" ||
      feedSubTab === "saves" ||
      feedSubTab === "tv" ||
      feedSubTab === "community");
  const findCommunitiesChromeTabActive = tab === "my-communities";
  const [dedicatedModalOpen, setDedicatedModalOpen] = useState(false);
  const [exitBusy, setExitBusy] = useState(false);

  useEffect(() => {
    if (sideChickLocked) {
      setDedicatedModalOpen(true);
    }
  }, [sideChickLocked]);

  const [showFilterOptions, setShowFilterOptions] = useState(false);

  useEffect(() => {
    if (tab !== "feed" || feedSubTab === "community") {
      setShowFilterOptions(false);
    }
  }, [tab, feedSubTab]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      data-explore-e2e-fixtures={e2eFixtures ? "1" : "0"}
      data-explore-e2e-fixtures-build={
        isExploreE2eFixturesEnvEnabled() ? "1" : "0"
      }
      data-explore-deploy-commit={
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "local"
      }
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
          // headerTint ? "" : "bg-white"
        )}
        onTouchStart={e => {
          headerPullRef.current = { startY: e.touches[0]?.clientY ?? 0 };
        }}
        onTouchMove={e => {
          if (!headerPullRef.current) return;
          const delta =
            (e.touches[0]?.clientY ?? 0) - headerPullRef.current.startY;
          if (delta > 40) {
            headerPullRef.current = null;
            openDiscoverSheet();
          }
        }}
        onTouchEnd={() => {
          headerPullRef.current = null;
        }}
      >
        <h1 className="sr-only">
          Tipmanna TV — Explore and discover community media
        </h1>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/explore"
            className="racing_sans_one text-sm sm:text-2xl"
          >
            <span className={"text-primary"}>tip</span>
            manna
          </Link>

          <button
            type="button"
            data-testid="explore-open-discover-panel"
            aria-label="Open Discover panel"
            className="cursor-pointer rounded border border-black p-0.25 sm:p-0.5"
            onClick={openDiscoverSheet}
          >
            <Bars3BottomLeftIcon className="size-4 sm:size-5" />
          </button>

          <div className="flex items-center gap-1 rounded-full p-1 text-sm">
            {/* <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1 transition",
                tab === "feed" && "bg-background shadow-sm"
              )}
              onPointerEnter={prefetchExploreFeedInitial}
              onClick={() => setMainTab("feed")}
            >
              Feed 
            </button> */}
            {sideChickLocked ? (
              <button
                type="button"
                onClick={() => setDedicatedModalOpen(true)}
                className="size-3 shrink-0 animate-pulse rounded-full bg-amber-400 ring-2 ring-amber-200 sm:hidden"
                title="Dedicated community mode"
                aria-label="Dedicated community mode — tap for details"
              />
            ) : null}

            {/* <button
              type="button"
              className={cn(
                "hidden rounded-full px-3 py-1 transition sm:inline-block",
                tab === "feed" &&
                  feedSubTab === "community" &&
                  "bg-background shadow-sm"
              )}
              onPointerEnter={prefetchExploreFeedInitial}
              onClick={() => {
                setMainTab("feed");
                setFeedSubTab("community");
              }}
            >
              Commmunity
            </button> */}
            {/* <button
              type="button"
              className={cn(
                "hidden rounded-full px-3 py-1 transition sm:inline-block",
                tab === "discover" && "bg-background shadow-sm"
              )}
              onClick={() => setTab("discover")}
            >
              Discover
            </button> */}
            {communityFeatureEnabled ? (
              <>
                {/* <Link
                  href={EXPLORE_COMMUNITY_HUB_HREF}
                  className="hidden rounded-full px-3 py-1 transition sm:inline-block"
                  onPointerEnter={prefetchExploreFeedInitial}
                >
                  Join communities
                </Link> */}
                <div className="hidden sm:block">
                  <SideChickCommunityMenu
                    rows={sideChickMenuRows}
                    highlight={false}
                    activeDedicatedCommunityId={
                      sideChickLocked ? dedicatedCommunityId : null
                    }
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {/* {(isHomePage || isTipperPage) && <Logo />} */}
          {communityFeatureEnabled && sideChickLocked ? (
            <button
              type="button"
              onClick={() => setDedicatedModalOpen(true)}
              className="hidden size-3 shrink-0 animate-pulse rounded-full bg-amber-400 ring-2 ring-amber-200 sm:inline-block"
              title="Dedicated community mode"
              aria-label="Dedicated community mode — tap for details"
            />
          ) : null}
        </div>

        <div className="-mr-10 flex items-center gap-1">
          <div
            className="relative hidden p-1 sm:block"
            onClick={openDiscoverSheetWithSearch}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                openDiscoverSheetWithSearch();
              }
            }}
            aria-label="Open discover search"
          >
            <Input
              type="text"
              placeholder="Search videos..."
              className="h-4 w-52 p-2 text-xs"
              value={headerSearch}
              onChange={e => setHeaderSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                }
              }}
              onClick={e => e.stopPropagation()}
            />
            <Search className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-600" />
          </div>

          <div className="flex items-center gap-1">
            <div
              className="relative p-1 sm:hidden"
              onClick={openDiscoverSheetWithSearch}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  openDiscoverSheetWithSearch();
                }
              }}
              aria-label="Open discover search"
            >
              <Input
                type="text"
                placeholder="Search videos..."
                className="h-4 w-32 text-xs"
                value={headerSearch}
                onChange={e => setHeaderSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                  }
                }}
                onClick={e => e.stopPropagation()}
              />
              <Search className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-600" />
            </div>
            <span className="bg-moonstone-blue size-[10px] rounded-full sm:size-4"></span>{" "}
            <span className="text-[10px] font-medium whitespace-nowrap sm:text-sm">
              {exploreLiveViewers.length} watching live
            </span>
          </div>
        </div>

        <span className="w-8 shrink-0" />
      </header>

      {/* NEW BLOCK */}
      <div
        className="flex items-center justify-between py-0.5"
        style={
          headerTint && headerContrast
            ? {
                backgroundColor: headerTint,
                color: headerContrast.foreground,
              }
            : undefined
        }
      >
        <div className="grid w-full grid-cols-12 gap-1 border-b bg-black">
          <div className="col-span-2 flex flex-col items-center justify-center pb-1">
            <button
              type="button"
              className={cn(
                "flex shrink-0 items-center justify-center gap-1 px-2.5 py-1 text-xs transition sm:px-3",
                findCommunitiesChromeTabActive &&
                  (sideChickLocked ? sideChickPillActive : "")
              )}
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus
                className="size-5 text-white"
                strokeWidth={3}
              />
            </button>
            <span className="text-[8px] text-white">Create</span>
          </div>

          <CreateDialog
            openPopup={createDialogOpen}
            setOpenPopup={setCreateDialogOpen}
            onExploreLayer
          />

          {/* <div className="flex items-center gap-1 flex-1 justify-center"> */}
          <button
            type="button"
            className={cn(
              "bg-secondary col-span-4 flex-1 px-2.5 py-1 text-xs text-black transition sm:px-3",
              feedChromeTabActive &&
                (sideChickLocked
                  ? sideChickPillActive
                  : "border border-black bg-white/80 text-black")
            )}
            data-testid="explore-chrome-feed"
            onPointerEnter={prefetchExploreFeedInitial}
            onClick={() => navigateMainTab("feed")}
          >
            Feed
          </button>

          <button
            type="button"
            className={cn(
              "bg-secondary col-span-4 -ml-3.5 px-1 py-1 text-xs text-black transition sm:px-3",
              findCommunitiesChromeTabActive &&
                (sideChickLocked
                  ? sideChickPillActive
                  : "border border-black bg-white text-black")
            )}
            data-testid="explore-chrome-start-community"
            onClick={() => navigateMainTab("my-communities")}
          >
            Start Community
          </button>
          {/* </div */}

          {/* <button
              type="button"
              className={cn(
                "rounded-full px-2.5 py-1 text-xs transition sm:px-3",
                tab === "feed" &&
                  feedSubTab === "tv" &&
                  "bg-background shadow-sm"
              )}
              onPointerEnter={prefetchExploreFeedInitial}
              onClick={() => {
                setMainTab("feed");
                setFeedSubTab("tv");
              }}
            >
              Watch TV
            </button> */}

          <button
            type="button"
            className={cn(
              "relative col-span-2 flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 py-0.5 text-[9px] leading-tight transition sm:px-3",
              findCommunitiesChromeTabActive &&
                (sideChickLocked ? sideChickPillActive : "")
            )}
            onClick={() => setIsProfileDrawerOpen(true)}
          >
            <span className="relative">
              <UserRound
                className="size-5 text-white"
                strokeWidth={3}
              />
              <NotificationBadge
                variant="dot"
                className="-top-1 -right-1"
              />
            </span>
            <span className="max-w-[4.5rem] truncate text-[8px] text-white/90">
              {isSignedInExplore
                ? "Signed in"
                : exploreUserRole === "VISITOR"
                  ? "Guest"
                  : "Not signed in"}
            </span>
          </button>

          {/* <ProfileDrawer /> */}
        </div>
      </div>

      <Dialog
        open={dedicatedModalOpen}
        onOpenChange={setDedicatedModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Explore feed and TV are limited to your dedicated community
            </DialogTitle>
            <DialogDescription>
              You are focused on{" "}
              <span className="text-foreground font-medium">
                {sideChick.activation?.community.name ?? "your community"}
              </span>
              . Trends, Saves, and Live TV on Explore are limited to that
              community until you reactivate Tipmanna Public and your other feed
              settings.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            disabled={exitBusy}
            onClick={() => {
              setExitBusy(true);
              void sideChick
                .exitDedicatedMode()
                .then(ok => {
                  if (ok) setDedicatedModalOpen(false);
                })
                .finally(() => setExitBusy(false));
            }}
          >
            Reactivate Tipmanna Public (exit dedicated mode)
          </Button>
        </DialogContent>
      </Dialog>

      {tab === "my-communities" ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <CommunityHubClient />
        </div>
      ) : null}

      {tab === "join" && joinCommunityId ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CommunityJoinPanel
            key={joinCommunityId}
            communityId={joinCommunityId}
            signInRedirectPath={exploreJoinHref(joinCommunityId)}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
          tab !== "feed" && "hidden"
        )}
        style={
          headerTint && headerContrast
            ? {
                backgroundColor: headerTint,
                color: headerContrast.foreground,
              }
            : headerTint
              ? { backgroundColor: headerTint }
              : undefined
        }
      >
        <div
          className="bg-background shrink-0 border-b"
          style={
            headerTint && headerContrast
              ? {
                  backgroundColor: headerTint,
                  color: headerContrast.foreground,
                }
              : headerTint
                ? { backgroundColor: headerTint }
                : undefined
          }
        >
          <div className="flex h-6 items-center justify-between gap-0.5 bg-black text-xs sm:h-8">
            <div className="flex min-h-4 min-w-0 flex-1 items-center gap-1 rounded-full px-2 text-white">
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 transition sm:px-3",
                    feedSubTab === "trends" &&
                      "bg-white/40 text-white shadow-lg"
                  )}
                  data-testid="explore-subtab-trends"
                  onPointerEnter={prefetchExploreFeedInitial}
                  onClick={() => navigateFeedSubTab("trends")}
                >
                  Trends
                </button>
                <button
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 transition sm:px-3",
                    feedSubTab === "saves" && "bg-white/40 text-white shadow-sm"
                  )}
                  data-testid="explore-subtab-saves"
                  onPointerEnter={() => {
                    prefetchExploreFeedInitial();
                    prefetchExploreSavesFeed();
                  }}
                  onClick={() => navigateFeedSubTab("saves")}
                >
                  Saves
                </button>
                <button
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 transition sm:px-3",
                    feedSubTab === "tv" && "bg-white/40 text-white shadow-sm"
                  )}
                  data-testid="explore-subtab-tv"
                  onPointerEnter={prefetchTvSchedule}
                  onClick={() => navigateFeedSubTab("tv")}
                >
                  TV
                </button>
                <button
                  type="button"
                  className={cn(
                    "hidden shrink-0 rounded-full px-2.5 transition sm:inline-block sm:px-3",
                    feedSubTab === "community" &&
                      "bg-white/40 text-white shadow-sm"
                  )}
                  data-testid="explore-subtab-community"
                  onPointerEnter={() => {
                    if (eligibleCommunityIdsForPrefetch.length) {
                      prefetchExploreCommunityFeed(
                        eligibleCommunityIdsForPrefetch
                      );
                    }
                  }}
                  onClick={() => navigateFeedSubTab("community")}
                >
                  Community
                </button>
              </div>

              <div className="flex min-h-5 min-w-0 items-center gap-2">
                {sideChickLocked ? (
                  <span
                    className="border-border text-foreground bg-muted/40 inline-flex max-w-[min(100%,8rem)] min-w-0 shrink items-center gap-1 rounded-md border px-2 py-1 sm:max-w-[min(100%,11rem)]"
                    title={dedicatedCommunityName}
                  >
                    <Lock className="text-muted-foreground size-3 shrink-0" />
                    <span className="truncate text-[10px] font-medium sm:text-[11px]">
                      {dedicatedCommunityName}
                    </span>
                  </span>
                ) : null}
                <DropdownMenu
                  onOpenChange={open => {
                    if (open) void loadCommunityCatalogForPicker();
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 max-w-full justify-between border-none bg-transparent px-2 text-xs font-normal shadow-none outline-none sm:max-w-md"
                      onPointerEnter={() => {
                        void loadCommunityCatalogForPicker();
                        if (eligibleCommunityIdsForPrefetch.length) {
                          prefetchExploreCommunityFeed(
                            eligibleCommunityIdsForPrefetch
                          );
                        }
                      }}
                    >
                      <span>
                        {eligibleCommunityPickerRows.length === 0
                          ? "My Communities"
                          : visibleCommunityFeedSelIds.length === 0
                            ? "My Communities"
                            : `${visibleCommunityFeedSelIds.length} communit${visibleCommunityFeedSelIds.length === 1 ? "y" : "ies"} selected`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <ExploreCommunityPickerMenu
                    eligibleCommunityPickerRows={eligibleCommunityPickerRows}
                    communityFeedSelIds={communityFeedSelIds}
                    onCommunityFeedPick={onCommunityFeedPick}
                    communityPickerMultiRef={communityPickerMultiRef}
                    topCommunities={topCommunities}
                    catalogAlphabetical={exploreCatalogAlphabetical}
                    topCommunitiesLoading={topCommunitiesLoading}
                    catalogLoading={communityPickerCatalogLoading}
                    onBrowseAllAz={() => {
                      void loadCommunityCatalogForPicker();
                    }}
                  />
                </DropdownMenu>
              </div>
            </div>

            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/80 inline-flex rounded-full p-1.5"
              aria-expanded={showFilterOptions}
              aria-label={showFilterOptions ? "Close filters" : "Open filters"}
              onClick={() => setShowFilterOptions(v => !v)}
            >
              <ListFilterPlus className="size-4 text-white" />
            </button>
          </div>

          {sideChickLocked ? (
            <p className="text-muted-foreground mt-2 px-0.5 text-[10px] leading-snug">
              Dedicated mode is active for {dedicatedCommunityName}. Change
              community or TV source to leave — you will be asked to confirm.
            </p>
          ) : activateDedicatedCandidate ? (
            <div className="mt-2 px-0.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={activateDedicatedBusy}
                onClick={() => void handleActivateDedicatedMode()}
              >
                {activateDedicatedBusy
                  ? "Activating…"
                  : `Activate dedicated mode (${activateDedicatedCandidate.community?.name ?? "community"})`}
              </Button>
            </div>
          ) : null}

          {feedSubTab === "community" ? (
            <div className="mt-2 space-y-2 px-0.5 pb-1">
              <p className="text-muted-foreground text-[10px] leading-snug">
                Clips come from each community&apos;s approved bank. Turn feed
                inclusion on or off under{" "}
                <Link
                  href={EXPLORE_COMMUNITY_HUB_HREF}
                  className="text-primary underline"
                >
                  Communities
                </Link>
                .
              </p>
            </div>
          ) : null}
        </div>

        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {sessionShellEnabled || tab === "feed" ? (
            // Long-lived Explore session: the reel stays mounted across tab
            // changes (Discover/Community/TV) so playback, feed position, preload
            // queues, caches and realtime subscriptions persist. The parent
            // wrapper is `hidden` and `feedSurfaceActive` pauses playback while
            // another surface is shown.
            <div
              className={cn(
                "flex h-full min-h-0 flex-1 flex-col",
                feedSubTab === "tv" && "hidden"
              )}
              data-testid="explore-feed-shell"
            >
              <ExploreFeedClient
                key={reelsKey}
                ref={exploreFeedRef}
                characters={characters}
                characterSets={characterSets}
                feedSurfaceActive={tab === "feed" && feedSubTab !== "tv"}
                feedMode={
                  feedSubTab === "community"
                    ? "community"
                    : feedSubTab === "saves"
                      ? "saves"
                      : "trends"
                }
                communityIds={
                  feedSubTab === "community"
                    ? scopedExploreCommunityIds
                    : undefined
                }
                tvExploreSource={tvExploreSource}
                trendsFilters={trendsFilters}
                ssrBoot={ssrBoot}
              />
            </div>
          ) : null}
          {feedSubTab === "tv" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ExploreTvScheduleFeed
                characters={characters}
                characterSets={characterSets}
                onPlayInExplore={handlePlayInExplore}
                tvExploreFilters={tvExploreFilters}
                feedSurfaceActive={tab === "feed" && feedSubTab === "tv"}
                tvSource={tvExploreSource}
                tvCommunityOptions={tvCommunitySelectOptions}
                onTvSourceChange={onTvExploreSourceChange}
                tvSourceLocked={false}
                dedicatedCommunityId={dedicatedCommunityId}
              />
            </div>
          ) : null}
        </div>
      </div>
      {tab === "discover" ? (
        <div
          ref={discoverTabScrollRef}
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <div className="bg-muted/40 mb-4 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              Discover is also available as a quick panel while you watch the
              feed.
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                // Reveal the feed underneath, then overlay the quick panel
                // (avoids panel-over-full-Discover and duplicate panel mounts).
                applyDiscoverNavIntent(
                  openPanelFromExpandedIntent(unifiedDiscoverNav)
                );
              }}
            >
              Open discover panel
            </Button>
          </div>
          <DiscoverPanel
            contents={contents}
            tippers={tippers}
            latestContents={latestContents}
            spotlightContents={spotlightContents}
            recommendedContents={recommendedContents}
            mostTippedContents={mostTippedContents}
            programs={programs}
            playlists={playlists}
            liveStreams={liveStreams}
            topCommunities={topCommunities}
            discoverEvents={discoverEvents}
            catalogLoading={catalogLoading}
            catalogRefreshing={catalogRefreshing}
            onRefreshCatalog={() =>
              void loadExploreCatalog({ background: true })
            }
            initialSearchTerm={discoverSearchTerm}
            onOpenBookmarks={() => {
              setProfileDrawerTab("saved");
              setIsProfileDrawerOpen(true);
            }}
            onPlayInExplore={handlePlayInExplore}
            suppressInlinePlaybackContentId={suppressDiscoverInlineContentId}
            surface="exploreTab"
            scrollContainerRef={discoverTabScrollRef}
          />
        </div>
      ) : null}

      <DiscoverSheet
        open={discoverSheetOpen}
        onClose={closeDiscoverSheet}
        onExpandToDiscover={expandDiscoverFromPanel}
        contents={contents}
        tippers={tippers}
        latestContents={latestContents}
        spotlightContents={spotlightContents}
        recommendedContents={recommendedContents}
        mostTippedContents={mostTippedContents}
        programs={programs}
        playlists={playlists}
        liveStreams={liveStreams}
        topCommunities={topCommunities}
        discoverEvents={discoverEvents}
        catalogLoading={catalogLoading}
        catalogRefreshing={catalogRefreshing}
        onRefreshCatalog={() => void loadExploreCatalog({ background: true })}
        initialSearchTerm={discoverSearchTerm}
        onOpenBookmarks={() => {
          setProfileDrawerTab("saved");
          setIsProfileDrawerOpen(true);
        }}
        onPlayInExplore={handlePlayInExplore}
        suppressInlinePlaybackContentId={suppressDiscoverInlineContentId}
      />

      {showFilterOptions && tab === "feed" && feedSubTab !== "community" ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[12500] cursor-default bg-black/25"
            aria-label="Close filters"
            onClick={() => setShowFilterOptions(false)}
          />
          <div
            className="border-border fixed top-[6.75rem] right-3 left-3 z-[12501] max-h-[min(70dvh,calc(100dvh-8rem))] overflow-y-auto rounded-xl border bg-white/30 p-3 text-white shadow-xl sm:left-auto sm:w-full sm:max-w-md"
            role="dialog"
            aria-label="Explore filters"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[10px] leading-snug text-white">
              Filters apply to Trends, Saves, and TV.
            </p>
            <div className="mt-2 space-y-2">
              <Label className="text-[11px] text-white/80">
                Video themes (eventVideoType)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {EXPLORE_EVENT_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid="explore-filter-type"
                    data-filter-value={opt.value}
                    onClick={() => toggleTrendEventType(opt.value)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition",
                      trendEventTypes.includes(opt.value)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label
                    htmlFor="explore-lang-overlay"
                    className="text-[11px]"
                  >
                    Language code
                  </Label>
                  <Input
                    id="explore-lang-overlay"
                    value={trendLanguage}
                    onChange={e => setTrendLanguageWithUrl(e.target.value)}
                    placeholder="e.g. en-GB"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="explore-country-overlay"
                    className="text-[11px]"
                  >
                    Country code
                  </Label>
                  <Input
                    id="explore-country-overlay"
                    value={trendCountry}
                    onChange={e => setTrendCountryWithUrl(e.target.value)}
                    placeholder="e.g. GB (use all for worldwide)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/90">
                <input
                  type="checkbox"
                  checked={includeEndedLive}
                  onChange={e => toggleIncludeEndedLive(e.target.checked)}
                  className="size-3.5 rounded border-white/40"
                  data-testid="explore-filter-ended-live"
                />
                Include ended live videos
              </label>
            </div>
          </div>
        </>
      ) : null}

      <ProfileDrawer
        isProfileDrawerOpen={isProfileDrawerOpen}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        initialTab={profileDrawerTab}
        initialAccountTab={notificationAccountTab}
        tipperEvents={tipperEvents}
        iTipped={iTipped}
        causes={causes}
      />
      <ExploreInstallPrompt />
      <DedicatedExitConfirmDialog
        open={dedicatedExit.confirmOpen}
        onOpenChange={open => {
          if (!open) dedicatedExit.cancelExit();
        }}
        communityName={dedicatedCommunityName}
        busy={dedicatedExit.busy}
        onConfirm={() => void dedicatedExit.confirmExit()}
      />
      <InstallPromptSheet
        open={activateInstallOpen}
        onOpenChange={setActivateInstallOpen}
      />
    </div>
  );
}
