/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Third-party imports
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Bookmark,
  ChevronRight,
  CircleHelp,
  Radio,
  Sparkles,
  Tv,
  UsersRound,
} from "lucide-react";

// Local imports
import { ThumbnailPlayer } from "./thumbnail-player";
import { cn } from "@/lib/utils";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { Button } from "../ui/button";
import { useMediaQuery } from "react-responsive";
import Link from "next/link";
import { searchContentsAction } from "@/actions/contents";
import { ContentCardSkeleton } from "./tv-loading-skeletons";
import {
  DISCOVER_RAIL_SUBTITLES,
  DISCOVER_RAIL_UPDATE_HINTS,
  EXPLORE_EVENT_TYPE_OPTIONS,
  eventTypeLabel,
  type DiscoverRailKey,
} from "@/lib/event-type-options";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isLiveStreamContent,
  resolveDiscoverContentTarget,
} from "@/lib/discover-content-routing";

const CONTENT_CARD_MIN = "min-w-[220px] sm:min-w-[270px] flex-shrink-0";
const PROGRAM_CARD_MIN = "min-w-[160px] sm:min-w-[220px] flex-shrink-0";

interface Content {
  event: any;
  id: string;
  title: string;
  url: string;
  liveStatus?: string | null;
}

export interface DiscoverPanelProps {
  contents: any[];
  tippers: any[];
  latestContents: any[];
  spotlightContents?: any[];
  recommendedContents?: any[];
  mostTippedContents: any[];
  programs?: Array<{
    id: string;
    title: string;
    scheduledAt: string;
    status: string;
    imageUrl?: string | null;
    landingUrl?: string | null;
    communityId?: string | null;
  }>;
  liveStreams?: {
    upcoming: any[];
    live: any[];
    recentlyEnded: any[];
  };
  catalogLoading?: boolean;
  /** Bookmark control: e.g. open profile / saved list */
  onOpenBookmarks?: () => void;
  className?: string;
  /** When false, omit the top "Discover contents" heading row (e.g. drawer supplies its own title). */
  showHeading?: boolean;
  /**
   * When set (Explore page), open the clip in the Explore reel instead of navigating to /content.
   */
  onPlayInExplore?: (target: ExploreFeedOpenTarget) => void;
  /** Inline Discover preview for this content id is hidden while Explore plays it from Discover. */
  suppressInlinePlaybackContentId?: string | null;
  /**
   * Routing surface:
   * - `discovery` (.com): live → `/channel/:eventId`; clips → `/content/:eventId`
   * - `exploreTab` (.tv sheet/tab): live → `/channel/:eventId` (never reel); clips → reel when `onPlayInExplore` is set
   */
  surface?: "discovery" | "exploreTab";
}

function DiscoverRailHeading({
  title,
  railKey,
}: {
  title: string;
  railKey: DiscoverRailKey;
}) {
  const subtitle = DISCOVER_RAIL_SUBTITLES[railKey];
  const updateHint = DISCOVER_RAIL_UPDATE_HINTS[railKey];
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <h5 className="font-semibold">{title}</h5>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground inline-flex shrink-0 rounded-full p-0.5 sm:hidden"
              aria-label={`How ${title} updates`}
            >
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-[220px]"
          >
            {subtitle}. {updateHint}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-muted-foreground text-xs">{subtitle}</p>
    </div>
  );
}

export { isLiveStreamContent } from "@/lib/discover-content-routing";

export function DiscoverPanel({
  contents,
  tippers,
  latestContents,
  spotlightContents = [],
  recommendedContents = [],
  mostTippedContents,
  programs = [],
  liveStreams = { upcoming: [], live: [], recentlyEnded: [] },
  catalogLoading = false,
  onOpenBookmarks,
  className,
  showHeading = true,
  onPlayInExplore,
  suppressInlinePlaybackContentId = null,
  surface = "exploreTab",
}: DiscoverPanelProps) {
  const form = useForm<{
    searchTerm: string;
  }>({
    defaultValues: { searchTerm: "" },
  });

  const isMobile = useMediaQuery({
    maxWidth: "500px",
  });

  const searchTerm = form.watch("searchTerm");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [tagResults, setTagResults] = useState<Content[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.trim()) {
      setSelectedTag(null);
    }
  }, [searchTerm]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = window.setTimeout(() => {
      void searchContentsAction(q, 30).then(res => {
        setSearchResults(
          res.success && Array.isArray(res.data) ? (res.data as Content[]) : []
        );
        setSearchLoading(false);
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedTag) {
      setTagResults([]);
      setTagLoading(false);
      return;
    }
    setTagLoading(true);
    void searchContentsAction("", 30, selectedTag).then(res => {
      setTagResults(
        res.success && Array.isArray(res.data) ? (res.data as Content[]) : []
      );
      setTagLoading(false);
    });
  }, [selectedTag]);

  const { push, prefetch } = useAppRouter();

  const goToChannel = useCallback(
    (eventId: string) => {
      const href = `/content/${eventId}`;
      prefetch(href);
      push(href);
    },
    [push, prefetch]
  );

  const openLiveStreamContent = useCallback(
    (content: Content) => {
      const eventId = content.event?.id;
      if (!eventId) return;
      const href = `/channel/${eventId}`;
      prefetch(href);
      push(href);
    },
    [push, prefetch]
  );

  const openDiscoverContent = useCallback(
    (content: Content) => {
      const target = resolveDiscoverContentTarget(
        content,
        surface,
        Boolean(onPlayInExplore)
      );
      if (target === "channel") {
        openLiveStreamContent(content);
        return;
      }
      if (target === "explore-reel" && onPlayInExplore) {
        onPlayInExplore({
          videoId: content.id,
          eventId: content.event.id,
          channelSnapshot: content as unknown as Record<string, unknown>,
        });
        return;
      }
      goToChannel(content.event.id);
    },
    [surface, onPlayInExplore, goToChannel, openLiveStreamContent]
  );

  const resolveContentClick = useCallback(
    (content: Content) => {
      openDiscoverContent(content);
    },
    [openDiscoverContent]
  );

  const filteredContents = useMemo(() => {
    if (searchTerm.trim()) return searchResults;
    return contents.filter(content =>
      content.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contents, searchResults, searchTerm]);

  const selectedTagLabel = useMemo(
    () => eventTypeLabel(selectedTag),
    [selectedTag]
  );

  const topContentsRef = useRef<HTMLDivElement>(null);
  const latestContentsRef = useRef<HTMLDivElement>(null);
  const spotlightContentsRef = useRef<HTMLDivElement>(null);
  const recommendedContentsRef = useRef<HTMLDivElement>(null);
  const mostTippedContentsRef = useRef<HTMLDivElement>(null);
  const programsRef = useRef<HTMLDivElement>(null);
  const liveStreamsRef = useRef<HTMLDivElement>(null);

  const resolvedSpotlight =
    spotlightContents.length > 0 ? spotlightContents : latestContents;

  const resolvedRecommended =
    recommendedContents.length > 0 ? recommendedContents : resolvedSpotlight;

  const liveStreamItems = useMemo(
    () => [
      ...liveStreams.live.map(c => ({ ...c, liveLabel: "Live now" })),
      ...liveStreams.upcoming.map(c => ({ ...c, liveLabel: "Starting soon" })),
      ...liveStreams.recentlyEnded.map(c => ({
        ...c,
        liveLabel: "Recently ended",
      })),
    ],
    [liveStreams]
  );

  const renderLiveRoomCue = (content: Content) => {
    if (!isLiveStreamContent(content)) return null;
    const status = content.liveStatus;
    const copy =
      status === "LIVE"
        ? "Live room · Opens in creator's event room"
        : status === "UPCOMING"
          ? "Starting soon · Opens in creator's event room"
          : status === "ENDED"
            ? "Recently ended · Opens in creator's event room"
            : DISCOVER_RAIL_SUBTITLES.live;
    return (
      <span className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-[10px]">
        <Radio
          className="size-3"
          aria-hidden
        />
        {copy}
      </span>
    );
  };

  const renderContentCard = (content: Content, minWidth = CONTENT_CARD_MIN) => (
    <div
      key={content.id}
      onClick={() => resolveContentClick(content)}
      className={cn(
        "relative flex cursor-pointer gap-1 border-2 bg-black/10",
        minWidth
      )}
    >
      <div className="space-y-1">
        <ThumbnailPlayer
          videoUrl={content.url}
          contentId={content.id}
          suppressInlinePlaybackContentId={suppressInlinePlaybackContentId}
          className="aspect-video w-full rounded-md"
        />
        <div className="p-1">
          <h5 className="text-sm">{content.title}</h5>
          {renderLiveRoomCue(content)}
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <UsersRound className="size-4" />
              {content.event?.numOfTips ?? 0} Tips
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="size-4" /> &pound;
              {content.event?.amountRaised ?? 0} raised
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const carouselSkeleton = (
    <div className="flex gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <ContentCardSkeleton
          key={i}
          className={CONTENT_CARD_MIN}
        />
      ))}
    </div>
  );

  const scrollNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showHeading ? (
        <h2 className="text-2xl font-semibold">Discover contents</h2>
      ) : null}

      {/* CONTENT SEARCH */}
      <Form {...form}>
        <form onSubmit={() => {}}>
          <FormField
            control={form.control}
            name="searchTerm"
            render={({ field }) => (
              <FormItem className="flex justify-between">
                <FormControl>
                  <Input
                    placeholder="Search..."
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>

                <Link href="/join">
                  <Button
                    size={isMobile ? "sm" : "sm"}
                    aria-label="Join an event to start tipping"
                    aria-haspopup="dialog"
                    className=""
                  >
                    Find event{" "}
                    {/* <ArrowRight
            className="-rotate-45"
            aria-hidden="true"
          /> */}
                  </Button>
                </Link>

                {onOpenBookmarks ? (
                  <button
                    type="button"
                    onClick={onOpenBookmarks}
                  >
                    <Bookmark />
                  </button>
                ) : null}
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* CONTENT TAGS */}
      <div className="flex flex-wrap gap-1 pb-4">
        <div className="flex gap-1 overflow-x-scroll pb-4">
          {EXPLORE_EVENT_TYPE_OPTIONS.map(opt => {
            const isSelected = selectedTag === opt.value;
            const tagClassName = cn(
              "rounded px-2 py-1 text-xs",
              isSelected ? "bg-black text-white" : "bg-gray-200"
            );
            const onTagClick = () => {
              setSelectedTag(prev => (prev === opt.value ? null : opt.value));
              if (!isSelected) form.setValue("searchTerm", "");
            };
            if (surface === "discovery") {
              return (
                <Link
                  key={opt.value}
                  href={`/discover/${opt.slug}`}
                  className={tagClassName}
                  onClick={e => {
                    if (isSelected) {
                      e.preventDefault();
                      onTagClick();
                    }
                  }}
                >
                  {opt.label}
                </Link>
              );
            }
            return (
              <button
                key={opt.value}
                type="button"
                onClick={onTagClick}
                className={tagClassName}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pb-8">
        {searchTerm && (
          <div className="space-y-4">
            <h5 className="font-semibold">
              Search results for &apos;{searchTerm}&apos;
            </h5>

            {searchLoading ? (
              <p className="text-muted-foreground text-sm">Searching…</p>
            ) : filteredContents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No results found.</p>
            ) : (
              <div className="scrollbar-none overflow-x-auto">
                <div className="flex gap-4">
                  {filteredContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => resolveContentClick(content)}
                      className={cn(
                        "cursor-pointer bg-black/10",
                        CONTENT_CARD_MIN
                      )}
                    >
                      <ThumbnailPlayer
                        videoUrl={content.url}
                        contentId={content.id}
                        suppressInlinePlaybackContentId={
                          suppressInlinePlaybackContentId
                        }
                        className="aspect-video w-full rounded-md"
                      />

                      <div className="p-1">
                        <h5 className="text-sm">{content.title}</h5>
                        {renderLiveRoomCue(content)}

                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <UsersRound className="size-4" />
                            {content.event.numOfTips} Tips
                          </span>
                          <span className="flex items-center gap-2">
                            <Sparkles className="size-4" /> &pound;
                            {content.event.amountRaised} raised
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTag && (
          <div className="space-y-4">
            <h5 className="font-semibold">
              Results for &apos;{selectedTagLabel}&apos;
            </h5>

            {tagLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : tagResults.length === 0 ? (
              <p className="text-muted-foreground text-sm">No results found.</p>
            ) : (
              <div className="scrollbar-none overflow-x-auto">
                <div className="flex gap-4">
                  {tagResults.map(content => (
                    <div
                      key={content.id}
                      onClick={() => resolveContentClick(content)}
                      className={cn(
                        "cursor-pointer bg-black/10",
                        CONTENT_CARD_MIN
                      )}
                    >
                      <ThumbnailPlayer
                        videoUrl={content.url}
                        contentId={content.id}
                        suppressInlinePlaybackContentId={
                          suppressInlinePlaybackContentId
                        }
                        className="aspect-video w-full rounded-md"
                      />

                      <div className="p-1">
                        <h5 className="text-sm">{content.title}</h5>
                        {renderLiveRoomCue(content)}

                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            {content.event.numOfTips} Tips
                          </span>
                          <span>
                            &pound; {content.event.amountRaised} raised
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOP CONTENTS */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Top contents"
            railKey="top"
          />

          <div className="relative">
            <div
              ref={topContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-6">
                {catalogLoading && contents.length === 0
                  ? carouselSkeleton
                  : contents.map((content: Content) =>
                      renderContentCard(content)
                    )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollNext(topContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* LATEST CONTENTS */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Latest contents"
            railKey="latest"
          />

          <div className="relative">
            <div
              ref={latestContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && latestContents.length === 0
                  ? carouselSkeleton
                  : latestContents.map((content: Content) =>
                      renderContentCard(content)
                    )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollNext(latestContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* SPOTLIGHT  */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Spotlight"
            railKey="spotlight"
          />

          <div className="relative">
            <div
              ref={spotlightContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && resolvedSpotlight.length === 0
                  ? carouselSkeleton
                  : resolvedSpotlight.map((content: Content) =>
                      renderContentCard(content)
                    )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollNext(spotlightContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* RECOMMENDED FOR YOU */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Recommended for you"
            railKey="recommended"
          />

          <div className="relative">
            <div
              ref={recommendedContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && resolvedRecommended.length === 0
                  ? carouselSkeleton
                  : resolvedRecommended.map((content: Content) =>
                      renderContentCard(content)
                    )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollNext(recommendedContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* PROGRAMS */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Programs"
            railKey="programs"
          />
          <div className="relative">
            <div
              ref={programsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && programs.length === 0 ? (
                  carouselSkeleton
                ) : programs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No active programs right now.
                  </p>
                ) : (
                  programs.map(program => (
                    <Link
                      key={program.id}
                      href={program.landingUrl ?? `/program/${program.id}`}
                      className={cn(
                        "rounded-md border bg-black/10 p-2",
                        PROGRAM_CARD_MIN
                      )}
                    >
                      {program.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={program.imageUrl}
                          alt=""
                          className="aspect-video w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-md">
                          <Tv className="size-8 text-neutral-500" />
                        </div>
                      )}
                      <p className="mt-2 text-sm font-medium">
                        {program.title}
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {program.status.toLowerCase()} ·{" "}
                        {new Date(program.scheduledAt).toLocaleString()}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
            {programs.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollNext(programsRef)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
              >
                <ChevronRight size={24} />
              </button>
            ) : null}
          </div>
        </div>

        {/* LIVE STREAMS */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Live streams"
            railKey="live"
          />
          <div className="relative">
            <div
              ref={liveStreamsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && liveStreamItems.length === 0 ? (
                  carouselSkeleton
                ) : liveStreamItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No live streams detected right now.
                  </p>
                ) : (
                  liveStreamItems.map(
                    (content: Content & { liveLabel?: string }) => (
                      <div
                        key={content.id}
                        data-testid="discover-live-stream-card"
                        className={cn("relative", CONTENT_CARD_MIN)}
                        onClick={() => openLiveStreamContent(content)}
                      >
                        {content.liveLabel ? (
                          <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white uppercase">
                            <Radio className="size-3" />
                            {content.liveLabel}
                          </span>
                        ) : null}
                        <div className="cursor-pointer bg-black/10">
                          <ThumbnailPlayer
                            videoUrl={content.url}
                            contentId={content.id}
                            suppressInlinePlaybackContentId={
                              suppressInlinePlaybackContentId
                            }
                            className="aspect-video w-full rounded-md"
                          />
                          <div className="p-1">
                            <h5 className="text-sm">{content.title}</h5>
                            {renderLiveRoomCue(content)}
                            <div className="text-muted-foreground flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <UsersRound className="size-4" />
                                {content.event?.numOfTips ?? 0} Tips
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
            {liveStreamItems.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollNext(liveStreamsRef)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
              >
                <ChevronRight size={24} />
              </button>
            ) : null}
          </div>
        </div>

        {/* MOST TIPPED CONTENTS */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Most tipped contents"
            railKey="mostTipped"
          />

          <div className="relative">
            <div
              ref={mostTippedContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {mostTippedContents.map((content: Content) => (
                  <div
                    key={content.id}
                    onClick={() => resolveContentClick(content)}
                    className={cn(
                      "cursor-pointer bg-black/10",
                      CONTENT_CARD_MIN
                    )}
                  >
                    <ThumbnailPlayer
                      videoUrl={content.url}
                      contentId={content.id}
                      suppressInlinePlaybackContentId={
                        suppressInlinePlaybackContentId
                      }
                      className="aspect-video w-full rounded-md"
                    />

                    <div className="space-y-1 p-1">
                      <h5 className="text-sm">{content.title}</h5>
                      {renderLiveRoomCue(content)}

                      <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <UsersRound className="size-4" />
                          {content.event.numOfTips} Tips
                        </span>{" "}
                        <span className="flex items-center gap-2">
                          <Sparkles className="size-4" /> &pound;
                          {content.event.amountRaised} raised
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollNext(mostTippedContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h5 className="font-semibold">Top tippers</h5>

          <div className="mt-4 mb-8 flex flex-wrap items-center gap-2">
            {tippers.slice(0, 5).map((tipper, index) => (
              <div
                key={tipper.id}
                className="inline-flex items-center gap-2 rounded-md bg-black/10 px-4 py-2 text-[13px]"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-black text-white">
                  {index + 1}
                </span>

                <span className="text-muted-foreground text-xs">
                  {tipper.username}
                </span>

                <span className="text-xs font-medium">
                  &pound;{tipper.totalTipped}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
