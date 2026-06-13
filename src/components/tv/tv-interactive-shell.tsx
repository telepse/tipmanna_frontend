/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { RefObject } from "react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ArrowUp,
  ChevronRight,
  ChevronsUp,
  ChevronsRight,
  Search,
  X,
} from "lucide-react";
const TipDrawer = dynamic(
  () =>
    import("../events/tip-drawer").then(m => ({
      default: m.TipDrawer,
    })),
  { ssr: false }
);
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { TVScheduleDrawer } from "./tv-schedule-drawer";
import { TvPlaylistPreview } from "./tv-playlist-preview";
import { TvLooper } from "./tv-looper";
import type { RoomCharacter } from "@/types";
import { useTV } from "../tv-provider";
import { TipSection } from "../events/tip-section";
import { TipsFeedPanel } from "../events/tips-feed-panel";
import { WebTvLooper } from "./web-tv-looper";
import { TopContentsPanel } from "./top-contents-panel";
import { LatestContentsPanel } from "./latest-contents-panel";
import { SpotlightPanel } from "./spotlight-panel";
import { MostTippedContentsPanel } from "./most-tipped-contents-panel";
import { SavedContentsPanel } from "./saved-contents-panel";
import { EventVideoTypeContentsPanel } from "./event-video-type-contents-panel";
import { TV_EVENT_VIDEO_TYPE_TAGS } from "./tv-event-video-type-tags";
import { Button } from "../ui/button";
import Image from "next/image";
import { UpcomingProgramsPanel } from "./upcoming-programs-panel";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "react-responsive";
import {
  TvLooperSkeleton,
  TvRightPanelSkeleton,
} from "./tv-loading-skeletons";

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
  activeTab: "playlist" | "tips";
  setActiveTab: (t: "playlist" | "tips") => void;
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

  const tipDrawerStripeMounted = isTipDrawerOpen || openWalletModalNonce > 0;

  const isDesktop = variant === "desktop";
  const isMobile = variant === "mobile";
  const playlistLayout = isDesktop ? "desktop" : "mobile";

  const [rightPanelView, setRightPanelView] = useState<
    | "playlist"
    | "top-contents"
    | "latest-contents"
    | "spotlight"
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
      id: "upcoming-programs",
      label: "Programs",
    },
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
      id: "most-tipped",
      label: "Most tipped",
    },
  ];

  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [isMobileFullView, setIsMobileFullView] = useState(false);

  const handleSearchOptions = () => {
    setShowSearchOptions(prev => !prev);
  };

  const isMobileLandscape =
    useMediaQuery({ query: "(orientation: landscape)" }) &&
    window.innerWidth <= 768;

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
        <div className="mt-16 hidden grid-cols-12 gap-2 lg:grid">
          <div className="col-span-9 object-cover">
            {tvReady && !isMobileLandscape ? (
              <WebTvLooper
                characters={characters}
                playerLayout="wide"
                analyticsSurface={tvAnalyticsSurface}
                onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
                onEngage={() => setIsTipDrawerOpen(true)}
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
            {!tvReady && !isMobileLandscape ? (
              <TvLooperSkeleton layout="wide" />
            ) : null}
          </div>

          <div className="relative col-span-3 flex w-full flex-col gap-1 rounded-2xl border border-gray-300 p-4">
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
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap outline ${
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
                  TV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVideoType(null);
                    setRightPanelView("saved");
                    setActiveTab("playlist");
                  }}
                  className={`rounded-md px-2 py-1 text-xs whitespace-nowrap ${
                    rightPanelView === "saved"
                      ? "bg-black text-white"
                      : "text-black underline"
                  }`}
                >
                  Saved
                </button>

                {rightPanelView !== "playlist" && (
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

                {rightPanelView === "top-contents" && <TopContentsPanel />}

                {rightPanelView === "latest-contents" && (
                  <LatestContentsPanel />
                )}

                {rightPanelView === "spotlight" && <SpotlightPanel />}

                {rightPanelView === "most-tipped" && (
                  <MostTippedContentsPanel />
                )}

                {rightPanelView === "saved" && <SavedContentsPanel />}

                {rightPanelView === "upcoming-programs" && (
                  <UpcomingProgramsPanel />
                )}

                {rightPanelView === "video-type" && selectedVideoType && (
                  <EventVideoTypeContentsPanel videoType={selectedVideoType} />
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

      {isMobile && !isMobileLandscape && (
        <div
          className={cn(
            isMobileFullView
              ? "fixed inset-0 z-[1100] flex min-h-0 w-full flex-col overflow-hidden bg-black"
              : "fixed top-[88px] right-0 bottom-0 left-0 flex max-h-[calc(100dvh-88px)] min-h-0 w-full flex-col overflow-hidden p-2"
          )}
        >
          {tvReady ? (
            <div
              className={cn(
                "flex min-h-0 w-full flex-col",
                isMobileFullView
                  ? "h-full flex-1"
                  : "flex-1 gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)]"
              )}
            >
              <div
                className={cn(
                  isMobileFullView
                    ? "min-h-0 flex-1 overflow-hidden"
                    : "min-h-[220px] shrink-0 basis-[min(52dvh,420px)] overflow-hidden"
                )}
              >
                <TvLooper
                  characters={characters}
                  playerLayout="compact"
                  analyticsSurface={tvAnalyticsSurface}
                  onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
                  onEngage={() => setIsTipDrawerOpen(true)}
                  onFullViewChange={setIsMobileFullView}
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
              </div>

              {!isMobileFullView ? (
                <>
                  <div className="hide__scrollbar flex w-full shrink-0 items-center gap-2 overflow-x-auto px-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("playlist")}
                      className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap outline ${
                        activeTab === "playlist"
                          ? "bg-black text-white"
                          : "bg-white text-black outline-black"
                      }`}
                    >
                      TV Playlist <ChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      data-testid="tv-nav-tips"
                      onClick={() => setActiveTab("tips")}
                      className={`flex shrink-0 items-center gap-1 rounded-md px-2 text-xs whitespace-nowrap outline ${
                        activeTab === "tips"
                          ? "bg-black text-white"
                          : "bg-white text-black outline-black"
                      }`}
                    >
                      <div
                        className={`${initialTipCount > 999 ? "tip-feed-marquee" : ""}`}
                      >
                        <div
                          className={`${initialTipCount > 999 ? "tip-feed-marquee-track" : ""}`}
                        >
                          {initialTipCount} Tips
                        </div>
                      </div>{" "}
                    </button>
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

                  {activeTab === "playlist" && (
                    <div className="relative flex min-h-0 w-full flex-1 flex-col items-start gap-2 overflow-hidden p-2">
                      <div
                        className="custom-scrollbar hide__scrollbar relative h-full min-h-0 w-full space-y-3 overflow-y-auto p-2"
                        ref={scrollRef}
                        onScroll={handleScroll}
                      >
                        <TvPlaylistPreview
                          layout={playlistLayout}
                          onSelectChannel={handleSelectChannel}
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

                  {activeTab === "tips" && (
                    <div
                      data-testid="tv-tips-feed"
                      className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-2"
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
      )}

      {isMobileLandscape && (
        <div className="relative z-[999] h-full w-full bg-black text-white">
          <WebTvLooper
            characters={characters}
            playerLayout="wide"
            analyticsSurface={tvAnalyticsSurface}
            onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
            onEngage={() => setIsTipDrawerOpen(true)}
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
        </div>
      )}

      <TVScheduleDrawer
        isTVDrawerOpen={isTVDrawerOpen}
        setIsTvDrawerOpen={setIsTvDrawerOpen}
      />

      {isMobileLandscape ? null : (
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
              Engage <ChevronsUp className="text-primary" />{" "}
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
            tippingCharacters={tippingCharactersForDrawer as RoomCharacter[]}
            enabled
          >
            {!isMobileLandscape && (
              <div className="absolute -bottom-12 hidden h-[220px] w-full bg-white/80 px-4 py-1 sm:block">
                <TipSection
                  key={videoTipKey || tipDrawerEventId}
                  eventId={tipDrawerEventId}
                  tippingCharacters={
                    tippingCharactersForDrawer as RoomCharacter[]
                  }
                  characterSets={characterSetsForDrawer}
                  paymentSurface={tvAnalyticsSurface}
                  paymentCommunityId={scheduleSourceCommunityId ?? undefined}
                  paymentChannelId={paymentChannelId}
                  getWatchDurationBeforePayMs={() => 0}
                  textTipUnitPrice={0}
                  sectionCtaLabel="Engage"
                  payLabel="Pay"
                />
              </div>
            )}
          </TippingElementsProvider>
        </div>
      )}

      {tipDrawerStripeMounted ? (
        <TippingElementsProvider
          tippingCharacters={tippingCharactersForDrawer as RoomCharacter[]}
          enabled
        >
          <TipDrawer
            key={videoTipKey || tipDrawerEventId}
            open={isTipDrawerOpen}
            onOpenChange={setIsTipDrawerOpen}
            eventId={tipDrawerEventId}
            tippingCharacters={tippingCharactersForDrawer}
            characterSets={characterSetsForDrawer}
            paymentSurface={tvAnalyticsSurface}
            paymentCommunityId={scheduleSourceCommunityId ?? undefined}
            paymentChannelId={paymentChannelId}
            openWalletModalNonce={openWalletModalNonce}
            onSnapshotPaymentRedirect={onSnapshotPaymentRedirect}
            stackAboveImmersive
          />
        </TippingElementsProvider>
      ) : null}
    </>
  );
}
