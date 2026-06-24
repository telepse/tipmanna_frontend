/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import {
  getAllFeaturedContentsAction,
  getDiscoveryProgramsAction,
  getLatestContents,
  getLiveStreamContents,
  getMostTippedContents,
  getSpotlightContents,
  getRecommendedContents,
} from "@/actions/contents";
import {
  getAllTopTippers,
  getTippedEventsForTipper,
  getTotalAmountTippedByTipper,
} from "@/actions/events";
import { getAllCausesAction } from "@/actions/home";
import {
  getMeJoinedCommunitiesAction,
  getMyCommunitiesAction,
} from "@/actions/communities";
import { cn } from "@/lib/utils";
import {
  buildTvPickerOptionsForUser,
  type TvCommunityBrief,
} from "@/lib/tv-community-picker";

import type { ExploreFeedClientHandle } from "./explore-feed-client";
import { ExploreTvScheduleFeed } from "./explore-tv-schedule-feed";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { exploreOpenTargetFromUrl } from "@/lib/explore-video-navigation";
import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";
import { getOrCreateAnonymousViewer } from "@/lib/anonymous-viewer";
import { pickContrastFgForHex } from "@/lib/pick-contrast-fg-for-bg";
import { useSideChick } from "@/components/community/side-chick-provider";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { ExploreInstallPrompt } from "@/components/pwa/explore-install-prompt";

const ExploreFeedClient = dynamic(
  () => import("./explore-feed-client").then(m => m.ExploreFeedClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50dvh] items-center justify-center text-sm text-muted-foreground">
        Loading feed…
      </div>
    ),
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

const EXPLORE_EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "CONCERT_MUSIC", label: "Concert" },
  { value: "DRAMA_ART", label: "Drama" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "FOOD", label: "Food" },
  { value: "HANG_OUT", label: "Hangout" },
  { value: "ISLAMIC", label: "Islamic" },
  { value: "CHRISTIAN", label: "Christian" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "COMEDY", label: "Comedy" },
  { value: "FASHION", label: "Fashion" },
  { value: "GAME_SPORT", label: "Game & sport" },
  { value: "CHILDREN", label: "Children" },
  { value: "EDUCATION", label: "Education" },
  { value: "OTHER", label: "Other" },
];

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
  const n = (m.community?.name ?? "").trim().toLowerCase();
  if (
    n === "tipmanna public" ||
    n === "tipmanna-public" ||
    n.includes("tipmanna public")
  ) {
    return true;
  }
  return Boolean(
    m.community?.isSystem && /\btipmanna\b/.test(n) && /\bpublic\b/.test(n)
  );
}

function parseExploreFeedTab(
  v: string | null
): "trends" | "saves" | "tv" | "community" | null {
  if (v === "trends" || v === "saves" || v === "tv" || v === "community")
    return v;
  return null;
}

type ExploreMainTab =
  | "feed"
  | "discover"
  | "community"
  | "my-communities"
  | "join";

export interface ExplorePageClientProps {
  characters: any[];
  characterSets: any[];
}

export default function ExplorePageClient({
  characters,
  characterSets,
}: ExplorePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pathBase = pathname ?? "/explore";
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const tabParam = searchParams.get("tab");
  const sideChick = useSideChick();
  const sideChickLocked =
    !sideChick.loading &&
    Boolean(sideChick.active && sideChick.activation?.communityId) &&
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";
  const dedicatedCommunityId = sideChick.activation?.communityId ?? null;
  const dedicatedCommunityName =
    sideChick.activation?.community.name ?? "Community";

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
   * Leaving Discover for Feed updates React state immediately, but `router.replace`
   * clears `?tab=discover` one tick later. Until then, ignore stale URL→tab sync so we
   * do not snap back to Discover (which blocked Discover→reel `openInExplore`).
   */
  const leaveDiscoverForFeedRef = useRef(false);

  const setMainTab = useCallback((next: ExploreMainTab) => {
    setTab(prev => {
      if (prev === "discover" && next === "feed") {
        leaveDiscoverForFeedRef.current = true;
      }
      return next;
    });
  }, []);

  const joinCommunityId = searchParams.get("joinCommunity")?.trim() ?? "";

  useEffect(() => {
    if (tab !== "join") return;
    if (!joinCommunityId) {
      setTab("my-communities");
      router.replace(EXPLORE_COMMUNITY_HUB_HREF, { scroll: false });
    }
  }, [tab, joinCommunityId, router]);

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

    setTab(prev => {
      if (leaveDiscoverForFeedRef.current && tabParam === "discover") {
        return prev;
      }
      return fromUrl;
    });
  }, [tabParam]);

  useEffect(() => {
    if (tab === "discover") prefetchExploreFeedInitial();
  }, [tab]);

  const [contents, setContents] = useState<any[]>([]);
  const [latestContents, setLatestContents] = useState<any[]>([]);
  const [spotlightContents, setSpotlightContents] = useState<any[]>([]);
  const [recommendedContents, setRecommendedContents] = useState<any[]>([]);
  const [mostTippedContents, setMostTippedContents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<{
    upcoming: any[];
    live: any[];
    recentlyEnded: any[];
  }>({ upcoming: [], live: [], recentlyEnded: [] });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [tippers, setTippers] = useState<any[]>([]);
  const [tipperEvents, setTipperEvents] = useState<any[]>([]);
  const [iTipped, setITipped] = useState(0);
  const [causes, setCauses] = useState<any[]>([]);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profileDrawerTab, setProfileDrawerTab] = useState<
    "notifications" | "reminders" | "saved" | "profile"
  >("notifications");
  const [communityFeedSelIds, setCommunityFeedSelIds] = useState<string[]>([]);
  const [joinedMemberships, setJoinedMemberships] = useState<
    JoinedMembershipRow[]
  >([]);
  const [hostTvCommunities, setHostTvCommunities] = useState<{
    owned: TvCommunityBrief[];
    coCreator: TvCommunityBrief[];
  }>({ owned: [], coCreator: [] });

  const exploreUserRole = useSelector((s: RootState) => s.auth.user?.role);
  const exploreAuthToken = useSelector((s: RootState) => s.auth.token);
  const isSignedInExplore =
    useSelector((s: RootState) => s.auth.isAuthenticated) &&
    (exploreUserRole === "HOST" || exploreUserRole === "TIPPER");
  const exploreUserId = useSelector((s: RootState) => s.auth.user?.id);

  useEffect(() => {
    if (!isSignedInExplore || !exploreUserId || !exploreAuthToken) {
      setJoinedMemberships([]);
      setHostTvCommunities({ owned: [], coCreator: [] });
      return;
    }
    let cancelled = false;
    void (async () => {
      const joinedPromise = getMeJoinedCommunitiesAction(exploreAuthToken);
      const hostPromise =
        exploreUserRole === "HOST"
          ? getMyCommunitiesAction(exploreAuthToken)
          : Promise.resolve(null);
      const [joinedRes, hostRes] = await Promise.all([
        joinedPromise,
        hostPromise,
      ]);
      if (cancelled) return;
      if (joinedRes.success && Array.isArray(joinedRes.data?.memberships)) {
        setJoinedMemberships(
          joinedRes.data.memberships as JoinedMembershipRow[]
        );
      } else {
        setJoinedMemberships([]);
      }
      if (hostRes?.success && hostRes.data) {
        const raw = hostRes.data as {
          owned?: TvCommunityBrief[];
          coCreator?: TvCommunityBrief[];
        };
        setHostTvCommunities({
          owned: raw.owned ?? [],
          coCreator: raw.coCreator ?? [],
        });
      } else {
        setHostTvCommunities({ owned: [], coCreator: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exploreAuthToken, exploreUserRole, isSignedInExplore, exploreUserId]);

  const [feedSubTab, setFeedSubTab] = useState<
    "trends" | "saves" | "tv" | "community"
  >("trends");
  /** Tipmanna global guide vs a joined community (schedule data unchanged until Phase 8). */
  const [tvExploreSource, setTvExploreSource] = useState<"tipmanna" | string>(
    "tipmanna"
  );
  const exploreFeedRef = useRef<ExploreFeedClientHandle>(null);
  /** Discover → Feed: defer reel open until Feed panel is visible (fixes playbackActive=false + 0 slide height). */
  const pendingExploreOpenRef = useRef<ExploreFeedOpenTarget | null>(null);
  const [exploreOpenNonce, setExploreOpenNonce] = useState(0);

  const [trendEventTypes, setTrendEventTypes] = useState<string[]>([]);
  const [trendLanguage, setTrendLanguage] = useState("");
  const [trendCountry, setTrendCountry] = useState("");

  const didHydrateExploreQs = useRef(false);
  const didHydrateExploreVideo = useRef(false);
  useLayoutEffect(() => {
    if (didHydrateExploreQs.current) return;
    didHydrateExploreQs.current = true;
    const sp = new URLSearchParams(searchParamsKey);
    const ft = sp.get("feedTypes");
    if (ft?.trim()) {
      setTrendEventTypes(
        ft
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
      );
    }
    const fl = sp.get("feedLang");
    if (fl?.trim()) setTrendLanguage(fl.trim());
    const fc = sp.get("feedCountry");
    if (fc?.trim()) setTrendCountry(fc.trim());
    const ftab = parseExploreFeedTab(sp.get("feedTab"));
    if (ftab) setFeedSubTab(ftab);
    const tvs = sp.get("tvSource")?.trim();
    if (tvs) setTvExploreSource(tvs);
    const comm = sp.get("communities");
    if (comm?.trim()) {
      const ids = comm
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      if (ids.length) setCommunityFeedSelIds(ids);
    }
  }, [searchParamsKey]);

  useEffect(() => {
    const p = new URLSearchParams(searchParamsKey);
    if (trendEventTypes.length) {
      p.set("feedTypes", trendEventTypes.join(","));
    } else {
      p.delete("feedTypes");
    }
    if (trendLanguage.trim()) {
      p.set("feedLang", trendLanguage.trim());
    } else {
      p.delete("feedLang");
    }
    if (trendCountry.trim()) {
      p.set("feedCountry", trendCountry.trim());
    } else {
      p.delete("feedCountry");
    }
    p.set("feedTab", feedSubTab);
    if (feedSubTab === "community" && communityFeedSelIds.length > 0) {
      p.set("communities", communityFeedSelIds.join(","));
    } else {
      p.delete("communities");
    }
    if (feedSubTab === "tv") {
      if (tvExploreSource !== "tipmanna") {
        p.set("tvSource", tvExploreSource);
      } else {
        p.delete("tvSource");
      }
    } else {
      p.delete("tvSource");
    }
    if (tab === "join" && joinCommunityId) {
      p.set("tab", "join");
      p.set("joinCommunity", joinCommunityId);
    } else if (tab === "join" && !joinCommunityId) {
      p.set("tab", "my-communities");
      p.delete("joinCommunity");
    } else if (tab === "my-communities") {
      p.set("tab", "my-communities");
      p.delete("joinCommunity");
    } else if (tab === "discover") {
      p.set("tab", "discover");
      p.delete("joinCommunity");
    } else if (tab === "community") {
      p.set("tab", "community");
      p.delete("joinCommunity");
    } else {
      p.delete("tab");
      p.delete("joinCommunity");
    }
    const q = p.toString();
    const nextHref = q ? `${pathBase}?${q}` : pathBase;
    const curHref = `${pathBase}${searchParamsKey ? `?${searchParamsKey}` : ""}`;
    if (nextHref === curHref) return;

    const handle = window.setTimeout(() => {
      router.replace(nextHref, { scroll: false });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [
    trendEventTypes,
    trendLanguage,
    trendCountry,
    feedSubTab,
    tvExploreSource,
    communityFeedSelIds,
    pathBase,
    router,
    searchParamsKey,
    tab,
    joinCommunityId,
  ]);

  useEffect(() => {
    if (!sideChickLocked || !dedicatedCommunityId) return;
    setCommunityFeedSelIds([dedicatedCommunityId]);
    setTvExploreSource(dedicatedCommunityId);
  }, [sideChickLocked, dedicatedCommunityId]);

  useEffect(() => {
    if (feedSubTab !== "community") return;
    if (sideChickLocked) return;
    if (communityFeedSelIds.length > 0) return;
    const eligible = joinedMemberships.filter(
      isEligibleForCommunityFeedDropdown
    );
    const ids = eligible.map(m => m.communityId);
    if (ids.length) setCommunityFeedSelIds(ids);
  }, [
    feedSubTab,
    joinedMemberships,
    communityFeedSelIds.length,
    sideChickLocked,
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
    }),
    [trendEventTypes, trendLanguage, trendCountry]
  );

  const scopedExploreCommunityIds = useMemo(() => {
    if (sideChickLocked && dedicatedCommunityId) {
      return [dedicatedCommunityId];
    }
    if (feedSubTab === "community") {
      return communityFeedSelIds;
    }
    if (communityFeedSelIds.length > 0) {
      return communityFeedSelIds;
    }
    return undefined;
  }, [sideChickLocked, dedicatedCommunityId, feedSubTab, communityFeedSelIds]);

  const reelsKey = useMemo(() => {
    if (feedSubTab === "saves") return "saves";
    if (feedSubTab === "tv") return "tv";
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

  const toggleTrendEventType = useCallback((value: string) => {
    setTrendEventTypes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }, []);

  const handlePlayInExplore = useCallback(
    (target: ExploreFeedOpenTarget) => {
      pendingExploreOpenRef.current = target;
      setSuppressDiscoverInlineContentId(target.videoId);
      setMainTab("feed");
      if (!sideChickLocked) {
        setFeedSubTab("trends");
      }
      setExploreOpenNonce(n => n + 1);
    },
    [setMainTab, sideChickLocked]
  );

  useLayoutEffect(() => {
    if (didHydrateExploreVideo.current) return;
    const target = exploreOpenTargetFromUrl(
      new URLSearchParams(searchParamsKey)
    );
    if (!target) return;
    didHydrateExploreVideo.current = true;
    handlePlayInExplore(target);
  }, [searchParamsKey, handlePlayInExplore]);

  /** Runs after Feed subtree commits so refs/layout exist; restores pending target if aborted before open (Strict Mode / cancel). */
  useLayoutEffect(() => {
    if (tab !== "feed" && tab !== "community") return;
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

    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(kick);
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (!opened) {
        pendingExploreOpenRef.current = target;
      }
    };
  }, [tab, exploreOpenNonce]);

  const loadExploreCatalog = useCallback(async () => {
    setCatalogLoading(true);
    const signedIn = isSignedInExplore && Boolean(exploreUserId?.trim());
    const [feat, lat, spot, rec, most, liveRes, progRes, tipRes, tipEv, iTip, causesRes] =
      await Promise.all([
        getAllFeaturedContentsAction(),
        getLatestContents(),
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
      ]);

    const featuredRaw = feat.data as unknown;
    const featuredList = Array.isArray(featuredRaw)
      ? featuredRaw
      : featuredRaw &&
          typeof featuredRaw === "object" &&
          "data" in featuredRaw &&
          Array.isArray((featuredRaw as { data: unknown }).data)
        ? (featuredRaw as { data: any[] }).data
        : [];

    setContents(featuredList);
    setLatestContents(lat.success && Array.isArray(lat.data) ? lat.data : []);
    setSpotlightContents(
      spot.success && Array.isArray(spot.data) ? spot.data : []
    );
    setRecommendedContents(
      rec.success && Array.isArray(rec.data) ? rec.data : []
    );
    setMostTippedContents(
      most.success && Array.isArray(most.data) ? most.data : []
    );
    if (liveRes.success && liveRes.data && typeof liveRes.data === "object") {
      const ls = liveRes.data as {
        upcoming?: any[];
        live?: any[];
        recentlyEnded?: any[];
      };
      setLiveStreams({
        upcoming: Array.isArray(ls.upcoming) ? ls.upcoming : [],
        live: Array.isArray(ls.live) ? ls.live : [],
        recentlyEnded: Array.isArray(ls.recentlyEnded) ? ls.recentlyEnded : [],
      });
    }
    setPrograms(
      progRes.success && Array.isArray(progRes.data) ? progRes.data : []
    );
    setTippers(tipRes.success && Array.isArray(tipRes.data) ? tipRes.data : []);
    setTipperEvents(
      tipEv.success && Array.isArray(tipEv.data) ? tipEv.data : []
    );
    setITipped(
      typeof iTip.data === "number" ? iTip.data : Number(iTip.data) || 0
    );
    setCauses(
      causesRes.success && Array.isArray(causesRes.data) ? causesRes.data : []
    );
    setCatalogLoading(false);
  }, [isSignedInExplore, exploreUserId]);

  useEffect(() => {
    if (tab !== "discover") return;
    void loadExploreCatalog();
  }, [tab, loadExploreCatalog]);

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

  const toggleCommunityFeedId = useCallback((id: string) => {
    setCommunityFeedSelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

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
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
          // headerTint ? "" : "bg-white"
        )}
      >
        <h1 className="sr-only">Tipmanna TV — Explore and discover community media</h1>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/explore"
            className="racing_sans_one text-sm sm:text-2xl"
          >
            <span className={"text-primary"}>tip</span>
            manna
          </Link>

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

            <div
              className="relative p-1 sm:hidden"
              onClick={() => setTab("discover")}
            >
              <Input
                type="text"
                placeholder="Search videos..."
                className="h-4 w-32 text-xs"
              />
              <Search className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-600" />
            </div>

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
                {/* <div className="hidden sm:block">
                  <SideChickCommunityMenu
                    rows={sideChickMenuRows}
                    highlight={false}
                  />
                </div> */}
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
            onClick={() => setTab("discover")}
          >
            <Input
              type="text"
              placeholder="Search videos..."
              className="h-4 w-52 p-2 text-xs"
            />
            <Search className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-600" />
          </div>
          <div className="flex items-center gap-1">
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
            onPointerEnter={prefetchExploreFeedInitial}
            onClick={() => {
              setMainTab("feed");
              if (feedSubTab === "community") setFeedSubTab("trends");
            }}
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
            onClick={() => setTab("my-communities")}
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
          "flex min-h-0 flex-1 flex-col overflow-hidden",
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
                  onPointerEnter={prefetchExploreFeedInitial}
                  onClick={() => {
                    setMainTab("feed");
                    setFeedSubTab("trends");
                  }}
                >
                  Trends
                </button>
                <button
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 transition sm:px-3",
                    feedSubTab === "saves" && "bg-white/40 text-white shadow-sm"
                  )}
                  onClick={() => {
                    setMainTab("feed");
                    setFeedSubTab("saves");
                  }}
                >
                  Saves
                </button>
                <button
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full px-2.5 transition sm:px-3",
                    feedSubTab === "tv" && "bg-white/40 text-white shadow-sm"
                  )}
                  onClick={() => {
                    setMainTab("feed");
                    setFeedSubTab("tv");
                  }}
                >
                  TV
                </button>
              </div>

              {sideChickLocked ? (
                <div
                  className="border-border text-foreground bg-muted/40 flex max-w-[min(100%,11rem)] min-w-0 shrink items-center gap-1.5 rounded-md border px-2 py-1 sm:max-w-[min(100%,18rem)]"
                  title={dedicatedCommunityName}
                >
                  <Lock className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate text-[11px] font-medium sm:text-xs">
                    {dedicatedCommunityName}
                  </span>
                </div>
              ) : (
                <div className="flex min-h-5 min-w-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 max-w-full justify-between border-none bg-transparent px-2 text-xs font-normal shadow-none outline-none sm:max-w-md"
                      >
                        <span>
                          {eligibleCommunityPickerRows.length === 0
                            ? "My Communities"
                            : communityFeedSelIds.length === 0
                              ? "My Communities"
                              : `${communityFeedSelIds.length} communit${communityFeedSelIds.length === 1 ? "y" : "ies"} selected`}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="z-[12550] w-[min(100vw-2rem,22rem)]"
                      align="start"
                    >
                      <DropdownMenuLabel className="text-xs">
                        Communities in Explore feed
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {eligibleCommunityPickerRows.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-3 text-xs">
                          Join a community with an active membership .<br />{" "}
                          Explore new communities on the{" "}
                          <Link
                            href="/community"
                            className="text-primary underline"
                          >
                            Communities
                          </Link>{" "}
                          page.
                        </div>
                      ) : (
                        eligibleCommunityPickerRows.map(m => (
                          <DropdownMenuCheckboxItem
                            key={m.communityId}
                            checked={communityFeedSelIds.includes(
                              m.communityId
                            )}
                            onCheckedChange={() =>
                              toggleCommunityFeedId(m.communityId)
                            }
                            className="text-xs"
                          >
                            {m.community?.name ?? m.communityId}
                          </DropdownMenuCheckboxItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
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
              Trends, Saves, and TV show only your dedicated community. Use the
              header warning dot to reactivate Tipmanna Public.
            </p>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {feedSubTab === "tv" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ExploreTvScheduleFeed
                characters={characters}
                characterSets={characterSets}
                onPlayInExplore={handlePlayInExplore}
                tvExploreFilters={tvExploreFilters}
                feedSurfaceActive={tab === "feed"}
                tvSource={tvExploreSource}
                tvCommunityOptions={tvCommunitySelectOptions}
                onTvSourceChange={setTvExploreSource}
                tvSourceLocked={sideChickLocked}
                lockedLabel={`Locked to ${dedicatedCommunityName} (dedicated mode)`}
              />
            </div>
          ) : tab === "feed" ? (
            <ExploreFeedClient
              key={reelsKey}
              ref={exploreFeedRef}
              characters={characters}
              characterSets={characterSets}
              feedSurfaceActive={tab === "feed"}
              feedMode={
                feedSubTab === "community"
                  ? "community"
                  : feedSubTab === "saves"
                    ? "saves"
                    : "trends"
              }
              communityIds={scopedExploreCommunityIds}
              trendsFilters={trendsFilters}
            />
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-4",
          tab !== "discover" && "hidden"
        )}
      >
        <DiscoverPanel
          contents={contents}
          tippers={tippers}
          latestContents={latestContents}
          spotlightContents={spotlightContents}
          recommendedContents={recommendedContents}
          mostTippedContents={mostTippedContents}
          programs={programs}
          liveStreams={liveStreams}
          catalogLoading={catalogLoading}
          onOpenBookmarks={() => {
            setProfileDrawerTab("saved");
            setIsProfileDrawerOpen(true);
          }}
          onPlayInExplore={handlePlayInExplore}
          suppressInlinePlaybackContentId={suppressDiscoverInlineContentId}
        />
      </div>

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
                    onChange={e => setTrendLanguage(e.target.value)}
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
                    onChange={e => setTrendCountry(e.target.value)}
                    placeholder="e.g. GB (use all for worldwide)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <ProfileDrawer
        isProfileDrawerOpen={isProfileDrawerOpen}
        setIsProfileDrawerOpen={setIsProfileDrawerOpen}
        initialTab={profileDrawerTab}
        tipperEvents={tipperEvents}
        iTipped={iTipped}
        causes={causes}
      />
      <ExploreInstallPrompt />
    </div>
  );
}
