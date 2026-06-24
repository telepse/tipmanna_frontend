/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Third-party imports
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Bookmark, ChevronRight, Radio, Sparkles, Tv, UsersRound } from "lucide-react";

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

interface Content {
  event: any;
  id: string;
  title: string;
  url: string;
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
}

const EVENT_TYPES = [
  "Christian",
  "Comedy",
  "Concert",
  "Drama",
  "Fashion",
  "Festival",
  "Food",
  "Game",
  "Hangout",
  "Islamic",
  "Other",
];

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
  const [searchLoading, setSearchLoading] = useState(false);

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

  const { push, prefetch } = useAppRouter();

  const goToChannel = useCallback(
    (eventId: string) => {
      const href = `/content/${eventId}`;
      prefetch(href);
      push(href);
    },
    [push, prefetch]
  );

  const openDiscoverContent = useCallback(
    (content: Content) => {
      if (onPlayInExplore) {
        onPlayInExplore({
          videoId: content.id,
          eventId: content.event.id,
          channelSnapshot: content as unknown as Record<string, unknown>,
        });
        return;
      }
      goToChannel(content.event.id);
    },
    [onPlayInExplore, goToChannel]
  );

  const filteredContents = useMemo(() => {
    if (searchTerm.trim()) return searchResults;
    return contents.filter(content =>
      content.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contents, searchResults, searchTerm]);

  const tagFilteredContents = useMemo(
    () =>
      selectedTag
        ? contents.filter(
            content =>
              content.event.eventType?.toLowerCase() ===
              selectedTag.toLowerCase()
          )
        : [],
    [contents, selectedTag]
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

  const renderContentCard = (content: Content, minWidth = "min-w-[270px]") => (
    <div
      key={content.id}
      onClick={() => openDiscoverContent(content)}
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
        <ContentCardSkeleton key={i} className="min-w-[270px]" />
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
          {EVENT_TYPES.map((theme, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setSelectedTag(theme);
                form.setValue("searchTerm", "");
              }}
              className={`rounded px-2 py-1 text-xs ${
                selectedTag === theme ? "bg-black text-white" : "bg-gray-200"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto pb-8">
        {searchTerm && (
          <div className="space-y-4">
            <h5 className="font-semibold">
              Search results for &apos;{searchTerm}&apos;
            </h5>

            {filteredContents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No results found.</p>
            ) : (
              <div className="scrollbar-none overflow-x-auto">
                <div className="flex gap-4">
                  {filteredContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => openDiscoverContent(content)}
                      className="min-w-[270px] flex-shrink-0 cursor-pointer bg-black/10"
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
              Search results for &apos;{selectedTag}&apos;
            </h5>

            {tagFilteredContents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No results found.</p>
            ) : (
              <div className="scrollbar-none overflow-x-auto">
                <div className="flex gap-4">
                  {tagFilteredContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => openDiscoverContent(content)}
                      className="min-w-[270px] flex-shrink-0 cursor-pointer bg-black/10"
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
          <h5 className="font-semibold">Top contents</h5>

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
          <h5 className="font-semibold">Latest contents</h5>

          <div className="relative">
            <div
              ref={latestContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && latestContents.length === 0
                  ? carouselSkeleton
                  : latestContents.map((content: Content) =>
                      renderContentCard(content, "min-w-[270px] flex-shrink-0")
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
          <h5 className="font-semibold">Spotlight</h5>

          <div className="relative">
            <div
              ref={spotlightContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && resolvedSpotlight.length === 0
                  ? carouselSkeleton
                  : resolvedSpotlight.map((content: Content) =>
                      renderContentCard(content, "min-w-[270px] flex-shrink-0")
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
          <h5 className="font-semibold">Recommended for you</h5>

          <div className="relative">
            <div
              ref={recommendedContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && resolvedRecommended.length === 0
                  ? carouselSkeleton
                  : resolvedRecommended.map((content: Content) =>
                      renderContentCard(content, "min-w-[270px] flex-shrink-0")
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
          <h5 className="font-semibold">Programs</h5>
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
                      className="min-w-[220px] flex-shrink-0 rounded-md border bg-black/10 p-2"
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
                      <p className="mt-2 text-sm font-medium">{program.title}</p>
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
          <h5 className="font-semibold">Live streams</h5>
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
                  liveStreamItems.map((content: Content & { liveLabel?: string }) => (
                    <div
                      key={content.id}
                      className="relative min-w-[270px] flex-shrink-0"
                    >
                      {content.liveLabel ? (
                        <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white uppercase">
                          <Radio className="size-3" />
                          {content.liveLabel}
                        </span>
                      ) : null}
                      {renderContentCard(content, "min-w-[270px] flex-shrink-0")}
                    </div>
                  ))
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
          <h5 className="font-semibold">Most tipped contents</h5>

          <div className="relative">
            <div
              ref={mostTippedContentsRef}
              className="scrollbar-none overflow-x-auto"
            >
              <div className="flex gap-4">
                {mostTippedContents.map((content: Content) => (
                  <div
                    key={content.id}
                    onClick={() => openDiscoverContent(content)}
                    className="min-w-[200px] flex-shrink-0 cursor-pointer bg-black/10"
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
