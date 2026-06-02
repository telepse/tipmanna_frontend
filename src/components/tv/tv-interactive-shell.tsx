/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { RefObject } from "react";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronsUp, ArrowUp, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { TipDrawer } from "../events/tip-drawer";
import { TippingElementsProvider } from "@/components/payments/tipping-elements-provider";
import { TVScheduleDrawer } from "./tv-schedule-drawer";
import { TvPlaylistPreview } from "./tv-playlist-preview";
import { TvLooper } from "./tv-looper";
import type { RoomCharacter } from "@/types";
import { useTV } from "../tv-provider";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";
import { BeatLoader } from "react-spinners";

export interface TvTipFeedMessage {
  id: string;
  sender: string;
  text: string;
  tip: number;
  purchasedSummary: string;
  event?: { id: string; previewVideoUrl?: string | null };
}

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
  tipFeed: TvTipFeedMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
  scrollProgress: number;
  handleScroll: () => void;
  tipDrawerEventId: string;
  tippingCharactersForDrawer: any[];
  characterSetsForDrawer: any[];
  openWalletModalNonce?: number;
  onSnapshotPaymentRedirect?: () => void;
  /** Inline TV source switcher (community memberships); hidden when locked. */
  tvInlineSourceOptions?: { id: string; name: string }[];
  tvInlineSourceCommunityId?: string | null;
  onTvInlineSourceChange?: (communityId: string | null) => void;
  tvInlineSourceLocked?: boolean;
};

export type TvInteractiveVariant = "mobile" | "desktop";

function TvSourceDropdown({
  communityId,
  options,
  onChange,
}: {
  communityId: string | null;
  options: { id: string; name: string }[];
  onChange: (id: string | null) => void;
}) {
  const label =
    communityId != null
      ? (options.find(c => c.id === communityId)?.name ?? "Community TV")
      : "Tipmanna TV";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800 shadow-sm"
          aria-label="TV source"
        >
          <Tv className="size-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">{label}</span>
          <ChevronDown className="size-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onChange(null)}>
          Tipmanna TV (global)
        </DropdownMenuItem>
        {options.map(c => (
          <DropdownMenuItem
            key={c.id}
            onClick={() => onChange(c.id)}
          >
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Shared interactive TV UI: looper, schedule, tips tab, Stripe tip drawer.
 * Used for both narrow (mobile) and wide (desktop) /tv layouts.
 */
export function TvInteractiveShell({
  variant,
  characters,
  tvReady,
  items,
  totalDuration,
  mode,
  goLive,
  switchToLocal,
  scheduleStale,
  scheduleError,
  retryScheduleLoad,
  activeTab,
  setActiveTab,
  handleSelectChannel,
  isTipDrawerOpen,
  setIsTipDrawerOpen,
  isTVDrawerOpen,
  setIsTvDrawerOpen,
  tipFeed,
  scrollRef,
  scrollProgress,
  handleScroll,
  tipDrawerEventId,
  tippingCharactersForDrawer,
  characterSetsForDrawer,
  openWalletModalNonce = 0,
  onSnapshotPaymentRedirect,
  tvInlineSourceOptions = [],
  tvInlineSourceCommunityId = null,
  onTvInlineSourceChange,
  tvInlineSourceLocked = false,
}: TvInteractiveShellProps) {
  const { currentIndex, playingItemOverride, scheduleSourceCommunityId } =
    useTV();
  const currentPlaying = playingItemOverride ?? items[currentIndex] ?? items[0];
  const paymentChannelId = currentPlaying?.channel?.id ?? null;
  const tvAnalyticsSurface = scheduleSourceCommunityId
    ? "community_tv_looper"
    : "tv_looper";

  const isDesktop = variant === "desktop";
  const isMobile = variant === "mobile";
  const bannerW = isDesktop ? "w-full" : "w-[330px]";
  const playlistLayout = isDesktop ? "desktop" : "mobile";

  const tipFeedListEl = useMemo(
    () =>
      tipFeed.map(msg => (
        <div
          key={msg.id}
          className="flex items-center justify-between rounded-md bg-white p-2 text-black ring-4 ring-gray-200"
        >
          <div className="flex flex-col">
            <p className="text-xs font-semibold">{msg.sender}</p>

            <p>
              {msg.text}
              {msg.tip ? (
                <span className="bg-secondary inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold">
                  {formatCurrency(msg.tip)}
                </span>
              ) : null}
            </p>

            {msg.purchasedSummary && (
              <p className="text-muted-foreground text-xs">
                {msg.purchasedSummary}
              </p>
            )}
          </div>

          {msg.event?.id ? (
            <Link href={`/channel/${msg.event.id}`}>
              {(() => {
                const thumbSrc =
                  msg.event?.previewVideoUrl &&
                  getYoutubeThumbnail(msg.event.previewVideoUrl);
                return thumbSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbSrc}
                    alt=""
                    className="h-[60px] w-[60px] shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="bg-muted inline-block h-[60px] w-[60px] shrink-0 rounded-md" />
                );
              })()}
            </Link>
          ) : (
            <span className="bg-muted h-[60px] w-[60px] shrink-0 rounded-md" />
          )}
        </div>
      )),
    [tipFeed]
  );

  const sidebarNav = (
    <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/90 p-3 shadow-sm backdrop-blur-sm">
      <p className="text-muted-foreground mb-3 px-1 text-[11px] font-semibold tracking-wide uppercase">
        Navigate
      </p>
      <nav
        className="flex flex-col gap-2"
        aria-label="TV playlist and tips"
      >
        <button
          type="button"
          onClick={() => setActiveTab("playlist")}
          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            activeTab === "playlist"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-black ring-1 ring-zinc-200 hover:bg-zinc-100"
          }`}
        >
          TV Playlist <ChevronDown className="size-4 shrink-0 opacity-70" />
        </button>
        <button
          type="button"
          data-testid="tv-nav-tips"
          onClick={() => setActiveTab("tips")}
          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            activeTab === "tips"
              ? "bg-black text-white shadow-sm"
              : "bg-white text-black ring-1 ring-zinc-200 hover:bg-zinc-100"
          }`}
        >
          Tips <ChevronDown className="size-4 shrink-0 opacity-70" />
        </button>
      </nav>
      <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200/80 pt-3">
        <button
          type="button"
          onClick={goLive}
          className={`w-full rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-white/80 ${
            mode === "GLOBAL"
              ? "text-destructive underline decoration-2"
              : "text-zinc-700"
          }`}
        >
          Live TV
        </button>
        <button
          type="button"
          onClick={switchToLocal}
          className={`w-full rounded-lg px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-white/80 ${
            mode === "LOCAL"
              ? "text-emerald-700 underline decoration-2"
              : "text-zinc-700"
          }`}
        >
          Your TV
        </button>
      </div>
      {!tvInlineSourceLocked &&
      tvInlineSourceOptions.length > 0 &&
      onTvInlineSourceChange ? (
        <div className="mt-4 border-t border-zinc-200/80 pt-3">
          <p className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold tracking-wide uppercase">
            TV source
          </p>
          <TvSourceDropdown
            communityId={tvInlineSourceCommunityId}
            options={tvInlineSourceOptions}
            onChange={onTvInlineSourceChange}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {scheduleStale && tvReady && (
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
      )}
      {scheduleError && !tvReady && (
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
      )}

      {isDesktop && (
        <div className="lg:grid hidden grid-cols-12 gap-4">
          <div className="col-span-9">
            {tvReady && (
              <TvLooper
                characters={characters}
                playerLayout="wide"
                analyticsSurface={tvAnalyticsSurface}
                tipsTabActive={activeTab === "tips"}
                onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
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
            )}
          </div>

          <div className="col-span-3 flex w-full flex-col gap-4">
            <div className="flex w-full items-center gap-2 px-3">
              <button
                type="button"
                onClick={() => setActiveTab("playlist")}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
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
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
                  activeTab === "tips"
                    ? "bg-black text-white"
                    : "bg-white text-black outline-black"
                }`}
              >
                Tips <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={goLive}
                className={`text-sm whitespace-nowrap ${mode === "GLOBAL" ? "text-destructive underline" : ""}`}
              >
                Live TV
              </button>
              <button
                type="button"
                onClick={switchToLocal}
                className={`text-sm whitespace-nowrap ${mode === "LOCAL" ? "text-success underline" : ""}`}
              >
                Your TV
              </button>
            </div>

            {activeTab === "playlist" && (
              <div className="relative -mt-1 flex max-h-[75vh] w-full flex-col items-start gap-2 overflow-y-auto p-2 pb-24">
                <div
                  className="custom-scrollbar relative max-h-[30vh] w-full space-y-4 overflow-y-auto p-2"
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
                className="-mt-3 max-h-[35vh] w-full space-y-4 overflow-y-auto p-3"
              >
                {tipFeed.length === 0 ? (
                  <p className="text-muted-foreground text-center text-sm">
                    No tips yet — they will appear here as tippers contribute.
                  </p>
                ) : (
                  tipFeedListEl
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isMobile && (
        <div className="fixed top-12 bottom-0 -mt-2 flex w-full flex-col p-2">
          {tvReady && (
            <>
              <div className="flex h-full w-full gap-2">
                <TvLooper
                  characters={characters}
                  playerLayout="compact"
                  analyticsSurface={tvAnalyticsSurface}
                  tipsTabActive={activeTab === "tips"}
                  onContinueCommentToTip={() => setIsTipDrawerOpen(true)}
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

              <div className="-mt-32 flex w-full items-center gap-2 px-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("playlist")}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
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
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-sm whitespace-nowrap outline ${
                    activeTab === "tips"
                      ? "bg-black text-white"
                      : "bg-white text-black outline-black"
                  }`}
                >
                  Tips <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={goLive}
                  className={`text-sm whitespace-nowrap ${mode === "GLOBAL" ? "text-destructive underline" : ""}`}
                >
                  Live TV
                </button>
                <button
                  type="button"
                  onClick={switchToLocal}
                  className={`text-sm whitespace-nowrap ${mode === "LOCAL" ? "text-success underline" : ""}`}
                >
                  Your TV
                </button>
              </div>
              {!tvInlineSourceLocked &&
              tvInlineSourceOptions.length > 0 &&
              onTvInlineSourceChange ? (
                <div className="px-3">
                  <TvSourceDropdown
                    communityId={tvInlineSourceCommunityId}
                    options={tvInlineSourceOptions}
                    onChange={onTvInlineSourceChange}
                  />
                </div>
              ) : null}

              {activeTab === "playlist" && (
                <div className="relative -mt-1 flex max-h-[75vh] w-full flex-col items-start gap-2 overflow-y-auto p-2 pb-24">
                  <div
                    className="custom-scrollbar relative max-h-[30vh] w-full space-y-4 overflow-y-auto p-2"
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
                  className="-mt-3 max-h-[35vh] w-full space-y-4 overflow-y-auto p-3"
                >
                  {tipFeed.length === 0 ? (
                    <p className="text-muted-foreground text-center text-sm">
                      No tips yet — they will appear here as tippers contribute.
                    </p>
                  ) : (
                    tipFeedListEl
                  )}
                </div>
              )}
            </>
          )}

          {!tvReady && (
            <div
              className="flex h-screen items-center justify-center"
              aria-busy="true"
              aria-label="Loading"
            >
              <BeatLoader
                color="#f57d11"
                size={20}
              />
            </div>
          )}
        </div>
      )}

      <TVScheduleDrawer
        isTVDrawerOpen={isTVDrawerOpen}
        setIsTvDrawerOpen={setIsTvDrawerOpen}
      />

      <div
        className={
          isDesktop
            ? "fixed bottom-0 left-0 z-50 flex w-full justify-center border-t-4 border-gray-200 bg-white py-2 shadow-lg"
            : "fixed bottom-16 -ml-2 w-full rounded-tl-2xl rounded-tr-2xl border-4 border-gray-200 bg-white pt-2 pb-0.5 drop-shadow-lg"
        }
      >
        <div className={isDesktop ? "w-full max-w-2xl px-4" : "w-full"}>
          <Button
            size="lg"
            onClick={() => setIsTipDrawerOpen(true)}
            className="relative -mt-2 -ml-4 flex h-8 w-full justify-center rounded-tl-2xl rounded-tr-2xl bg-transparent text-sm text-black"
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
      </div>

      <TippingElementsProvider
        tippingCharacters={tippingCharactersForDrawer as RoomCharacter[]}
      >
        <TipDrawer
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
    </>
  );
}
