/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Third-party imports
import {
  ArrowUp,
  ChevronRight,
  ChevronsUp,
  Search,
  X,
  MoveUpRight,
  UsersRound,
} from "lucide-react";
const TipDrawer = dynamic(
  () =>
    import("../events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);
const ProgramsPanel = dynamic(
  () =>
    import("./programs-panel").then(m => ({
      default: m.ProgramsPanel,
    })),
  { ssr: false }
);
const TopContentsPanel = dynamic(
  () =>
    import("./top-contents-panel").then(m => ({
      default: m.TopContentsPanel,
    })),
  { ssr: false }
);
const LatestContentsPanel = dynamic(
  () =>
    import("./latest-contents-panel").then(m => ({
      default: m.LatestContentsPanel,
    })),
  { ssr: false }
);
const SpotlightPanel = dynamic(
  () =>
    import("./spotlight-panel").then(m => ({
      default: m.SpotlightPanel,
    })),
  { ssr: false }
);
const RecommendedForYouPanel = dynamic(
  () =>
    import("./recommended-for-you-panel").then(m => ({
      default: m.RecommendedForYouPanel,
    })),
  { ssr: false }
);
const LiveStreamsPanel = dynamic(
  () =>
    import("./live-streams-panel").then(m => ({
      default: m.LiveStreamsPanel,
    })),
  { ssr: false }
);
const TopCommunitiesPanel = dynamic(
  () =>
    import("./top-communities-panel").then(m => ({
      default: m.TopCommunitiesPanel,
    })),
  { ssr: false }
);
const MostTippedContentsPanel = dynamic(
  () =>
    import("./most-tipped-contents-panel").then(m => ({
      default: m.MostTippedContentsPanel,
    })),
  { ssr: false }
);
const SavedContentsPanel = dynamic(
  () =>
    import("./saved-contents-panel").then(m => ({
      default: m.SavedContentsPanel,
    })),
  { ssr: false }
);
const EventVideoTypeContentsPanel = dynamic(
  () =>
    import("./event-video-type-contents-panel").then(m => ({
      default: m.EventVideoTypeContentsPanel,
    })),
  { ssr: false }
);
const UpcomingProgramsPanel = dynamic(
  () =>
    import("./upcoming-programs-panel").then(m => ({
      default: m.UpcomingProgramsPanel,
    })),
  { ssr: false }
);
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { buildSurfaceTipPriceCatalog } from "@/lib/surface-tip-price-catalog";
import { runPortraitAlignedMobileLandscapeClose } from "@/lib/mobile-landscape-close";
import { tvTrace } from "@/lib/tvDebugLog";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { TVScheduleDrawer } from "./tv-schedule-drawer";
import { TvPreviewPlaylistDrawer } from "./tv-preview-playlist-drawer";
import { TvPlaylistPreview } from "./tv-playlist-preview";
import { TvLooper } from "./tv-looper";
import type { RoomCharacter } from "@/types";
import { useTV } from "../tv-provider";
import { resolveTipDrawerPresentation } from "@/lib/resolve-tip-drawer-sets";
import { useFeatureCardTipContext } from "@/components/video-feature/feature-card-tip-context";
import { TipSection } from "../events/tip-section";
import { TipsFeedPanel } from "../events/tips-feed-panel";
import { WebTvLooper } from "./web-tv-looper";
import { TvLooperSkeleton, TvRightPanelSkeleton } from "./tv-loading-skeletons";
import { TV_EVENT_VIDEO_TYPE_TAGS } from "./tv-event-video-type-tags";
import { Button } from "../ui/button";
import Image from "next/image";
import {
  cn,
  formatProgramScheduleDisplay,
  getStatusColor,
  trimTitle,
} from "@/lib/utils";
import {
  DISCOVERY_PROGRAMS_DISPLAY_LIMIT,
  takeRecentDiscoveryPrograms,
} from "@/lib/discover-programs";
import { TV_MOBILE_SHELL_TOP } from "./tv-express-buttons";
import { useTvSurfaceMode } from "@/hooks/use-tv-surface-mode";
import { TvPhoneLandscapeTopBar } from "./tv-phone-landscape-top-bar";

export type TvInteractiveShellProps = {
  variant: TvInteractiveVariant;
  characters: RoomCharacter[];
  tvReady: boolean;
  items: any[];
  totalDuration: number;
  mode: "GLOBAL" | "LOCAL";
  goLive: () => void;
  switchToLocal: () => void;
  scheduleStale: boolean;
  scheduleError: boolean;
  retryScheduleLoad: () => void;
  activeTab: "playlist" | "tips" | "programs";
  setActiveTab: (t: "playlist" | "tips" | "programs") => void;
  handleSelectChannel: (index: number) => void;
  isTipDrawerOpen: boolean;
  setIsTipDrawerOpen: (open: boolean) => void;
  isTVDrawerOpen: boolean;
  setIsTvDrawerOpen: (open: boolean) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollProgress: number;
  handleScroll: () => void;
  tipDrawerEventId: string;
  tippingCharactersForDrawer: any[];
  characterSetsForDrawer: any[];
  videoTipKey?: string;
  openWalletModalNonce?: number;
  onSnapshotPaymentRedirect?: () => void;
};

export type TvInteractiveVariant = "mobile" | "desktop";

export const PROGRAM_DISPLAY_TIMEZONE = "UK";

/**
 * Shared interactive TV UI: looper, schedule, tips tab, Stripe tip drawer.
 * Used for both narrow (mobile) and wide (desktop) /tv layouts.
 */
export function TvInteractiveShell({
  variant,
  characters,
  tvReady,
  items,
  mode,
  goLive,
  switchToLocal,
  activeTab,
  setActiveTab,
  handleSelectChannel,
  isTipDrawerOpen,
  setIsTipDrawerOpen,
  isTVDrawerOpen,
  setIsTvDrawerOpen,
  scrollRef,
  scrollProgress,
  handleScroll,
  tipDrawerEventId,
  tippingCharactersForDrawer,
  characterSetsForDrawer,
  videoTipKey = "",
  openWalletModalNonce = 0,
  onSnapshotPaymentRedirect,
}: TvInteractiveShellProps) {
  const { currentIndex, playingItemOverride, scheduleSourceCommunityId } =
    useTV();
  const { setActiveVideoFeatureCardId } = useFeatureCardTipContext();
  const currentPlaying = playingItemOverride ?? items[currentIndex] ?? items[0];
  const paymentChannelId = currentPlaying?.channel?.id ?? null;
  const tvAnalyticsSurface = scheduleSourceCommunityId
    ? "community_tv_looper"
    : "tv_looper";

  const initialTipCount = useMemo(() => {
    const channel = currentPlaying?.channel as
      | { numOfTips?: number }
      | undefined;
    if (typeof channel?.numOfTips === "number") return channel.numOfTips;
    const scheduleEvent = (currentPlaying as { numOfTips?: number } | undefined)
      ?.numOfTips;
    if (typeof scheduleEvent === "number") return scheduleEvent;
    return 0;
  }, [currentPlaying]);

  const tipsFeedPanelEl = (
    <TipsFeedPanel
      variant="standalone"
      eventId={tipDrawerEventId}
      channelId={paymentChannelId != null ? String(paymentChannelId) : null}
      eventRoomTipCount={initialTipCount}
      videoTipCount={initialTipCount}
      enabled={activeTab === "tips" && Boolean(tipDrawerEventId)}
      showTipCount={false}
    />
  );

  const tipPres = useTipPresentation(
    tipDrawerEventId,
    tippingCharactersForDrawer as RoomCharacter[],
    { paymentSurface: tvAnalyticsSurface }
  );

  const { drawerSets: resolvedDrawerSets, stripPool: tipStripPool } = useMemo(
    () =>
      resolveTipDrawerPresentation(
        characterSetsForDrawer,
        tipPres.catalog as RoomCharacter[],
        undefined,
        tipPres.eliteCharacterIds
      ),
    [characterSetsForDrawer, tipPres.catalog, tipPres.eliteCharacterIds]
  );

  const handleTipFromFeatureCard = useCallback(
    (cardId: string) => {
      setActiveVideoFeatureCardId(cardId);
      setIsTipDrawerOpen(true);
    },
    [setActiveVideoFeatureCardId, setIsTipDrawerOpen]
  );

  const tipPriceCatalog = useMemo(
    () =>
      buildSurfaceTipPriceCatalog({
        enrichedCatalog: tipPres.catalog as RoomCharacter[],
        videoCatalog: tippingCharactersForDrawer as RoomCharacter[],
        characterSets: resolvedDrawerSets,
      }),
    [tipPres.catalog, tippingCharactersForDrawer, resolvedDrawerSets]
  );

  const tipDrawerStripeMounted = isTipDrawerOpen || openWalletModalNonce > 0;

  const isDesktop = variant === "desktop";
  const isMobile = variant === "mobile";
  const playlistLayout = isDesktop ? "desktop" : "mobile";

  const [rightPanelView, setRightPanelView] = useState<
    | "playlist"
    | "programs"
    | "top-contents"
    | "latest-contents"
    | "spotlight"
    | "recommended-for-you"
    | "top-communities"
    | "live-streams"
    | "most-tipped"
    | "saved"
    | "video-type"
    | "upcoming-programs"
  >("playlist");

  const [selectedVideoType, setSelectedVideoType] = useState<string | null>(
    null
  );

  const DISCOVER_SECTIONS = [
    {
      id: "top-contents",
      label: "Top contents",
    },
    {
      id: "latest-contents",
      label: "Latest contents",
    },
    {
      id: "spotlight",
      label: "Spotlight",
    },
    {
      id: "recommended-for-you",
      label: "Recommended for you",
    },
    {
      id: "top-communities",
      label: "Top communities",
    },
    {
      id: "programs",
      label: "Programs",
    },
    {
      id: "live-streams",
      label: "Live streams",
    },
    {
      id: "most-tipped",
      label: "Most tipped contents",
    },
  ];

  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [isMobileFullView, setIsMobileFullView] = useState(false);
  const [landscapeLayoutDismissed, setLandscapeLayoutDismissed] =
    useState(false);
  const [isPreviewPlaylistDrawerOpen, setIsPreviewPlaylistDrawerOpen] =
    useState(false);
  const exitFullRef = useRef<(() => void) | null>(null);
  const router = useRouter();

  const handleSearchOptions = () => {
    setShowSearchOptions(prev => !prev);
  };

  const { mode: surfaceMode } = useTvSurfaceMode();
  const showPhoneLandscapeImmersive =
    surfaceMode === "phoneLandscape" && !landscapeLayoutDismissed;

  const openPreviewPlaylistDrawer = useCallback(() => {
    setIsTvDrawerOpen(false);
    setIsPreviewPlaylistDrawerOpen(true);
  }, [setIsTvDrawerOpen]);

  const openScheduleDrawer = useCallback(() => {
    setIsPreviewPlaylistDrawerOpen(false);
    setIsTvDrawerOpen(true);
  }, [setIsTvDrawerOpen]);

  const registerExitFull = useCallback((exitFull: (() => void) | null) => {
    exitFullRef.current = exitFull;
  }, []);

  const handleMobileLandscapeClose = () => {
    tvTrace("navigation", "landscape_close_click", {
      isMobileFullView,
      landscapeLayoutDismissed,
      action: isMobileFullView ? "exit_full_view" : "dismiss_landscape_layout",
    });

    if (isMobileFullView) {
      runPortraitAlignedMobileLandscapeClose(router, {
        isFullView: true,
        exitFull: () => {
          exitFullRef.current?.();
          setIsMobileFullView(false);
        },
        explorePath: "/tv",
      });
      return;
    }

    setLandscapeLayoutDismissed(true);
    setIsPreviewPlaylistDrawerOpen(false);
    setIsTvDrawerOpen(false);
  };

  useEffect(() => {
    const onOrientation = () => {
      const landscape =
        typeof window !== "undefined" &&
        window.matchMedia("(orientation: landscape)").matches;
      tvTrace("navigation", "orientation_change", {
        orientation: landscape ? "landscape" : "portrait",
        innerWidth: typeof window !== "undefined" ? window.innerWidth : null,
      });
      if (!landscape) {
        setLandscapeLayoutDismissed(false);
        setIsPreviewPlaylistDrawerOpen(false);
      }
    };
    window.addEventListener("orientationchange", onOrientation);
    return () => window.removeEventListener("orientationchange", onOrientation);
  }, []);

  const [programs, setPrograms] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState({
    upcoming: [],
    live: [],
    recentlyEnded: [],
  });
  const [topCommunities, setTopCommunities] = useState<any[]>([]);

  useEffect(() => {
    const loadPrograms = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/programs/discovery?limit=${DISCOVERY_PROGRAMS_DISPLAY_LIMIT}`
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPrograms(takeRecentDiscoveryPrograms(list));
    };

    loadPrograms();
  }, []);

  useEffect(() => {
    const loadLiveStreams = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/contents/live-streams`
      );
      console.log("res", res);
      const data = await res.json();
      console.log("data", data);
      setLiveStreams(data as any);
    };

    loadLiveStreams();
  }, []);

  useEffect(() => {
    const loadTopCommunities = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/communities/top?limit=3`
      );

      const data = await res.json();

      setTopCommunities(data.communities ?? []);
    };

    void loadTopCommunities();
  }, []);

  return (
    <>
      {/* {scheduleStale && tvReady && (
        <div
          className={`mt-4 rounded-md border border-amber-600 bg-amber-50 p-4 text-sm text-black ${bannerW}`}
        >
          <p className="font-medium">
            Using a cached TV schedule (offline or server error).
          </p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry fresh load
          </button>
        </div>
      )} */}
      {/* {scheduleError && !tvReady && (
        <div
          className={`border-destructive mt-4 rounded-md border bg-white p-4 text-sm text-black ${bannerW}`}
        >
          <p className="font-medium">Unable to load the TV schedule.</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry
          </button>
        </div>
      )} */}

      {isDesktop && (
        <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-2">
          <div className="min-h-[50vh] object-cover lg:col-span-9 lg:min-h-[60vh]">
            {tvReady ? (
              <WebTvLooper
                characters={tipPriceCatalog as RoomCharacter[]}
                playerLayout="wide"
                analyticsSurface={tvAnalyticsSurface}
                onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
                onEngage={() => setIsTipDrawerOpen(true)}
                onTipFeatured={handleTipFromFeatureCard}
                sectionCtaLabel={tipPres.sectionCtaLabel ?? "Engage"}
                pageDrawerOpen={isTipDrawerOpen}
                commentDrawerVideoTitle={
                  typeof currentPlaying?.channel?.title === "string"
                    ? currentPlaying.channel.title
                    : ""
                }
                commentDrawerVideoDescription={
                  typeof (currentPlaying?.channel as { description?: string })
                    ?.description === "string"
                    ? String(
                        (currentPlaying?.channel as { description: string })
                          .description
                      )
                    : ""
                }
              />
            ) : null}
            {!tvReady ? <TvLooperSkeleton layout="wide" /> : null}
          </div>

          <div className="relative flex w-full flex-col gap-1 rounded-2xl border border-gray-300 p-4 lg:col-span-3">
            {!tvReady ? (
              <TvRightPanelSkeleton layout="desktop" />
            ) : (
              <>
                {/* Existing content */}
                <div className="flex items-center justify-between gap-4 border-b-2 border-gray-300">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goLive}
                      className={`text-xs whitespace-nowrap ${
                        mode === "GLOBAL" ? "text-destructive underline" : ""
                      }`}
                    >
                      Live TV
                    </button>

                    <button
                      type="button"
                      onClick={switchToLocal}
                      className={`text-xs whitespace-nowrap ${
                        mode === "LOCAL" ? "text-success underline" : ""
                      }`}
                    >
                      Your TV
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="tv-nav-tips"
                    onClick={() => setActiveTab("tips")}
                    className={`flex items-center gap-1 rounded-md px-1 text-xs whitespace-nowrap outline ${
                      activeTab === "tips"
                        ? "bg-black text-white"
                        : "bg-white text-black outline-black"
                    }`}
                  >
                    {initialTipCount} tips
                  </button>
                </div>
                {/* TV Categories */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative z-20">
                      {showSearchOptions ? (
                        <X
                          className="size-4 cursor-pointer"
                          role="button"
                          onClick={handleSearchOptions}
                        />
                      ) : (
                        <Search
                          className="size-4 cursor-pointer text-black"
                          role="button"
                          onClick={handleSearchOptions}
                        />
                      )}

                      {showSearchOptions && (
                        <div className="absolute top-6 left-0 flex w-52 flex-col gap-2 rounded-2xl border-2 border-gray-300 bg-white/80 p-2">
                          {DISCOVER_SECTIONS.map(section => (
                            <button
                              key={section.id}
                              onClick={() => {
                                setRightPanelView(
                                  section.id as typeof rightPanelView
                                );
                                setShowSearchOptions(false);
                              }}
                              className="flex cursor-pointer items-center gap-1"
                            >
                              <ChevronRight className="text-moonstone-blue size-4" />

                              <span
                                className={`rounded-md px-2 py-1 text-xs whitespace-nowrap ${section.id === rightPanelView ? "bg-moonstone-blue text-black" : "bg-white text-black"}`}
                              >
                                {section.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVideoType(null);
                        setRightPanelView("playlist");
                        setActiveTab("playlist");
                      }}
                      className={`rounded-md p-1 text-xs ${
                        rightPanelView === "playlist"
                          ? "bg-black text-white"
                          : "bg-gray-200 text-black"
                      }`}
                    >
                      TV playlist
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        console.log("TV Programs clicked");
                        setSelectedVideoType(null);
                        setRightPanelView("programs");
                        setActiveTab("playlist");
                      }}
                      className={`cursor-pointer rounded-md p-1 text-[10px] ${
                        rightPanelView === "programs"
                          ? "bg-black text-white"
                          : "bg-gray-200 text-black"
                      }`}
                    >
                      TV programs
                    </button>
                  </div>

                  {rightPanelView !== "playlist" &&
                    rightPanelView !== "programs" &&
                    rightPanelView !== "top-communities" && (
                      <div className="hide__scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                        {TV_EVENT_VIDEO_TYPE_TAGS.map(tag => (
                          <button
                            key={tag.value}
                            type="button"
                            onClick={() => {
                              setSelectedVideoType(tag.value);
                              setRightPanelView("video-type");
                              setActiveTab("playlist");
                            }}
                            className={`rounded-full px-2 py-1 text-[10px] whitespace-nowrap ${
                              rightPanelView === "video-type" &&
                              selectedVideoType === tag.value
                                ? "bg-black text-white"
                                : "bg-gray-200 text-black"
                            }`}
                          >
                            {tag.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                {/* Dynamic Content */}
                {activeTab === "playlist" && (
                  <div className="animate-in fade-in relative -mt-2 -ml-2 flex max-h-[45vh] w-full flex-col items-start gap-1 overflow-y-auto p-2">
                    {rightPanelView === "playlist" && (
                      <>
                        <div
                          className="hide__scrollbar relative h-full max-h-[45vh] w-full space-y-4 overflow-y-auto p-2"
                          ref={scrollRef}
                          onScroll={handleScroll}
                        >
                          <TvPlaylistPreview
                            layout={playlistLayout}
                            onSelectChannel={handleSelectChannel}
                            onContinueCommentToTip={() =>
                              setIsTipDrawerOpen(true)
                            }
                            tippingCharacters={
                              tipPriceCatalog as RoomCharacter[]
                            }
                          />

                          <button
                            type="button"
                            onClick={() => setIsTvDrawerOpen(true)}
                            className="mt-2 flex items-center gap-2 text-sm"
                          >
                            See full schedule
                            <ArrowUp className="size-4" />
                          </button>
                        </div>

                        <div className="absolute top-0 right-1 flex h-full w-2 justify-center">
                          <div className="relative h-full w-[2px] bg-gray-200">
                            <div
                              className="bg-primary absolute left-1/2 size-2 -translate-x-1/2 rounded-full transition-transform"
                              style={{
                                top: `${scrollProgress}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {rightPanelView === "programs" && (
                      <Suspense fallback={<div>Loading programs...</div>}>
                        <ProgramsPanel programs={programs} />
                      </Suspense>
                    )}

                    {rightPanelView === "top-contents" && <TopContentsPanel />}

                    {rightPanelView === "latest-contents" && (
                      <LatestContentsPanel />
                    )}

                    {rightPanelView === "spotlight" && <SpotlightPanel />}

                    {rightPanelView === "recommended-for-you" && (
                      <RecommendedForYouPanel />
                    )}

                    {rightPanelView === "top-communities" && (
                      <TopCommunitiesPanel communities={topCommunities} />
                    )}

                    {rightPanelView === "live-streams" && (
                      <LiveStreamsPanel liveStreams={liveStreams} />
                    )}

                    {rightPanelView === "most-tipped" && (
                      <MostTippedContentsPanel />
                    )}

                    {rightPanelView === "saved" && <SavedContentsPanel />}

                    {rightPanelView === "video-type" && selectedVideoType && (
                      <EventVideoTypeContentsPanel
                        videoType={selectedVideoType}
                      />
                    )}
                  </div>
                )}
                {activeTab === "tips" && (
                  <div
                    data-testid="tv-tips-feed"
                    className="-mt-3 max-h-[35vh] w-full overflow-y-auto p-3"
                  >
                    {tipsFeedPanelEl}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {isMobile && (
        <>
          <div
            className={cn(
              showPhoneLandscapeImmersive
                ? "fixed inset-0 z-[999] flex min-h-0 w-full flex-col overflow-hidden bg-black text-white"
                : isMobileFullView
                  ? "fixed inset-0 z-[1100] flex min-h-0 w-full flex-col overflow-hidden bg-black"
                  : "fixed right-0 bottom-0 left-0 flex min-h-0 w-full flex-col overflow-hidden px-2 pt-0 pb-2"
            )}
            style={
              showPhoneLandscapeImmersive || isMobileFullView
                ? undefined
                : {
                    top: TV_MOBILE_SHELL_TOP,
                    maxHeight: `calc(100dvh - ${TV_MOBILE_SHELL_TOP})`,
                  }
            }
          >
            {showPhoneLandscapeImmersive ? (
              <TvPhoneLandscapeTopBar
                mode={mode}
                onClose={handleMobileLandscapeClose}
                onGoLive={goLive}
                onSwitchToLocal={switchToLocal}
                onOpenPreviewPlaylist={openPreviewPlaylistDrawer}
                onOpenSchedule={openScheduleDrawer}
              />
            ) : null}
            {tvReady ? (
              <div
                className={cn(
                  "flex min-h-0 w-full flex-col",
                  showPhoneLandscapeImmersive || isMobileFullView
                    ? "h-full flex-1"
                    : "flex-1 gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)]"
                )}
              >
                <div
                  className={cn(
                    showPhoneLandscapeImmersive || isMobileFullView
                      ? "min-h-0 flex-1 overflow-hidden"
                      : "min-h-[220px] shrink-0 basis-[min(52dvh,420px)] overflow-hidden"
                  )}
                >
                  <TvLooper
                    key="mobile-tv-looper"
                    characters={tipPriceCatalog as RoomCharacter[]}
                    layout={
                      showPhoneLandscapeImmersive
                        ? "mobileImmersive"
                        : "mobileInline"
                    }
                    lockFullLandscape={showPhoneLandscapeImmersive}
                    analyticsSurface={tvAnalyticsSurface}
                    onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
                    onEngage={() => setIsTipDrawerOpen(true)}
                    onTipFeatured={handleTipFromFeatureCard}
                    sectionCtaLabel={tipPres.sectionCtaLabel ?? "Engage"}
                    pageDrawerOpen={isTipDrawerOpen}
                    onFullViewChange={setIsMobileFullView}
                    onRegisterExitFull={registerExitFull}
                    commentDrawerVideoTitle={
                      typeof currentPlaying?.channel?.title === "string"
                        ? currentPlaying.channel.title
                        : ""
                    }
                    commentDrawerVideoDescription={
                      typeof (
                        currentPlaying?.channel as { description?: string }
                      )?.description === "string"
                        ? String(
                            (
                              currentPlaying?.channel as {
                                description: string;
                              }
                            ).description
                          )
                        : ""
                    }
                    showSideRails={
                      !showPhoneLandscapeImmersive && !isMobileFullView
                    }
                  />
                </div>

                {!showPhoneLandscapeImmersive && !isMobileFullView ? (
                  <>
                    <div className="hide__scrollbar flex w-full shrink-0 items-center justify-between gap-2 overflow-x-auto px-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("playlist")}
                          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs break-keep whitespace-nowrap outline ${
                            activeTab === "playlist"
                              ? "bg-primary text-black"
                              : "border border-black bg-white text-black"
                          }`}
                        >
                          TV Playlist
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("programs")}
                          className={`flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-[10px] whitespace-nowrap outline ${activeTab === "programs" ? "bg-primary text-black" : "border border-black bg-white text-black"}`}
                        >
                          TV Programs
                        </button>
                        <button
                          type="button"
                          data-testid="tv-nav-tips"
                          onClick={() => setActiveTab("tips")}
                          className={`flex shrink-0 items-center gap-1 rounded-md px-1 text-xs whitespace-nowrap outline ${
                            activeTab === "tips"
                              ? "bg-primary text-black"
                              : "bg-white text-black"
                          }`}
                        >
                          {/* <div
                            className={`${initialTipCount > 999 ? "tip-feed-marquee" : ""}`}
                          >
                            <div
                              className={`${initialTipCount > 999 ? "tip-feed-marquee-track" : ""}`}
                            >
                              {initialTipCount} Tips
                            </div>
                          </div> */}
                          <UsersRound className="size-4" />
                        </button>
                      </div>

                      <div className="mr-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={goLive}
                          className={`shrink-0 text-xs whitespace-nowrap ${mode === "GLOBAL" ? "text-destructive underline" : ""}`}
                        >
                          Live TV
                        </button>
                        <button
                          type="button"
                          onClick={switchToLocal}
                          className={`shrink-0 text-xs whitespace-nowrap ${mode === "LOCAL" ? "text-success underline" : ""}`}
                        >
                          Your TV
                        </button>
                      </div>
                    </div>

                    {activeTab === "playlist" && (
                      <div className="relative -mt-2 flex min-h-0 w-full flex-1 flex-col items-start gap-2 overflow-hidden p-2">
                        <div
                          className="custom-scrollbar hide__scrollbar relative h-full min-h-0 w-full space-y-3 overflow-y-auto p-2"
                          ref={scrollRef}
                          onScroll={handleScroll}
                        >
                          <TvPlaylistPreview
                            layout={playlistLayout}
                            onSelectChannel={handleSelectChannel}
                            onContinueCommentToTip={() =>
                              setIsTipDrawerOpen(true)
                            }
                            tippingCharacters={
                              tipPriceCatalog as RoomCharacter[]
                            }
                          />

                          <button
                            type="button"
                            onClick={() => setIsTvDrawerOpen(true)}
                            className="mt-2 flex items-center gap-2 text-sm"
                          >
                            See full schedule <ArrowUp className="size-4" />
                          </button>
                        </div>

                        <div className="absolute top-0 right-1 flex h-full w-2 justify-center">
                          <div className="relative h-full w-[2px] bg-gray-200">
                            <div
                              className="bg-primary absolute left-1/2 size-2 -translate-x-1/2 rounded-full transition-transform"
                              style={{
                                top: `${scrollProgress}%`,
                                transform: `translate(-50%, -50%)`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "programs" && (
                      <div className="relative -mt-2 flex min-h-0 w-full flex-1 flex-col items-start gap-2 overflow-y-auto p-2">
                        {programs.map(program => (
                          <div
                            key={program.id}
                            className="border-primary w-full rounded-md border-2 px-2 py-1"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h5 className="flex gap-2">
                                  <Link
                                    href={program.landingUrl}
                                    className="text-sm"
                                    target="_blank"
                                  >
                                    {trimTitle(program.title, 25)}
                                  </Link>
                                  <MoveUpRight className="size-4" />
                                </h5>

                                <span
                                  className={getStatusColor(
                                    program.programStatus
                                  )}
                                >
                                  {program.programStatus}
                                </span>
                              </div>

                              <div className="text-muted-foreground flex items-center justify-between text-xs">
                                <p className="flex items-center gap-1 text-[10px]">
                                  <span>
                                    Time:{" "}
                                    {formatProgramScheduleDisplay(
                                      program.scheduledAt
                                    )}
                                  </span>

                                  <span>({PROGRAM_DISPLAY_TIMEZONE})</span>
                                </p>

                                <span className="text-[10px]">
                                  {program.communityName}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "tips" && (
                      <div
                        data-testid="tv-tips-feed"
                        className="relative -mt-2 flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-2"
                      >
                        {tipsFeedPanelEl}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-0 w-full flex-1 flex-col gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)]">
                <div className="min-h-[220px] shrink-0 basis-[min(52dvh,420px)]">
                  <TvLooperSkeleton layout="compact" />
                </div>
                <TvRightPanelSkeleton layout="mobile" />
              </div>
            )}
          </div>
        </>
      )}

      <TvPreviewPlaylistDrawer
        open={isPreviewPlaylistDrawerOpen}
        onOpenChange={setIsPreviewPlaylistDrawerOpen}
        onSelectChannel={handleSelectChannel}
        onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
        tippingCharacters={tipPriceCatalog as RoomCharacter[]}
        onOpenFullSchedule={openScheduleDrawer}
      />

      <TVScheduleDrawer
        isTVDrawerOpen={isTVDrawerOpen}
        setIsTvDrawerOpen={setIsTvDrawerOpen}
        tippingCharacters={tipPriceCatalog as RoomCharacter[]}
      />

      {isMobile && showPhoneLandscapeImmersive ? null : (
        <div
          className={cn(
            isDesktop
              ? "fixed bottom-0 left-0 z-50 flex w-full justify-center border-t-4 border-gray-200 bg-white py-2 shadow-lg"
              : "fixed right-0 bottom-0 left-0 z-50 w-full rounded-tl-2xl rounded-tr-2xl border-4 border-gray-200 bg-white pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] drop-shadow-lg",
            isMobileFullView && "hidden"
          )}
        >
          <div className={isDesktop ? "w-full max-w-2xl px-4" : "w-full"}>
            <Button
              size="lg"
              onClick={() => setIsTipDrawerOpen(true)}
              className="relative -mt-1 flex h-11 w-full justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-sm text-black lg:hidden"
            >
              <Image
                src="/icons/love.png"
                alt="Love"
                width={10}
                height={10}
                className="size-5"
              />
              <Image
                src="/icons/star.png"
                alt="Star"
                width={10}
                height={10}
                className="size-5"
              />
              <ChevronsUp className="text-primary" />
              {tipPres.sectionCtaLabel?.trim() || "Engage"}{" "}
              <ChevronsUp className="text-primary" />{" "}
              <Image
                src="/icons/burger.png"
                alt="Burger"
                width={10}
                height={10}
                className="size-5"
              />
              <Image
                src="/icons/chicken.png"
                alt="Chicken"
                width={10}
                height={10}
                className="size-5"
              />
            </Button>
          </div>

          <TippingElementsProvider
            tippingCharacters={tipPriceCatalog as RoomCharacter[]}
            enabled={false}
            textTipUnitPrice={tipPres.textUnitPrice}
          >
            {!showPhoneLandscapeImmersive && (
              <div className="absolute -bottom-12 hidden h-[220px] w-full bg-white/80 px-4 py-1 sm:block">
                <TipSection
                  key={videoTipKey || tipDrawerEventId}
                  eventId={tipDrawerEventId}
                  tippingCharacters={tipPriceCatalog as RoomCharacter[]}
                  stripCharacters={tipStripPool as RoomCharacter[]}
                  characterSets={resolvedDrawerSets}
                  paymentSurface={tvAnalyticsSurface}
                  paymentCommunityId={scheduleSourceCommunityId ?? undefined}
                  paymentChannelId={paymentChannelId}
                  getWatchDurationBeforePayMs={() => 0}
                  textTipUnitPrice={tipPres.textUnitPrice}
                  sectionCtaLabel={tipPres.sectionCtaLabel ?? "Engage"}
                  payLabel={tipPres.payLabel ?? "Pay"}
                  eliteCharacterIds={tipPres.eliteCharacterIds}
                  stackDrawerAboveImmersive
                  externalDrawer
                  onRequestOpenDrawer={() => setIsTipDrawerOpen(true)}
                  onRequestOpenWallet={() => setIsTipDrawerOpen(true)}
                />
              </div>
            )}
          </TippingElementsProvider>
        </div>
      )}

      {tipDrawerStripeMounted ? (
        <TippingElementsProvider
          tippingCharacters={tipPriceCatalog as RoomCharacter[]}
          enabled
          textTipUnitPrice={tipPres.textUnitPrice}
        >
          <TipDrawer
            key={videoTipKey || tipDrawerEventId}
            open={isTipDrawerOpen}
            onOpenChange={setIsTipDrawerOpen}
            eventId={tipDrawerEventId}
            tippingCharacters={tipPriceCatalog}
            characterSets={resolvedDrawerSets}
            paymentSurface={tvAnalyticsSurface}
            paymentCommunityId={scheduleSourceCommunityId ?? undefined}
            paymentChannelId={paymentChannelId}
            openWalletModalNonce={openWalletModalNonce}
            onSnapshotPaymentRedirect={onSnapshotPaymentRedirect}
            stackAboveImmersive
            textTipUnitPrice={tipPres.textUnitPrice}
            tipQuoteContext={tipPres.quoteCtx}
          />
        </TippingElementsProvider>
      ) : null}
    </>
  );
}
