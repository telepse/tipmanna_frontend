/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Third-party imports
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Bookmark,
  ChevronRight,
  CircleHelp,
  Radio,
  Search,
  Sparkles,
  Tv,
  UsersRound,
} from "lucide-react";
import { cn, formatProgramScheduleDisplay, trimTitle } from "@/lib/utils";
import { takeRecentDiscoveryPrograms } from "@/lib/discover-programs";

// Local imports
import { ThumbnailPlayer } from "./thumbnail-player";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { warmExploreVideoHandoff } from "@/lib/explore-video-navigation";
import {
  discoverySearchAction,
  type DiscoverySearchResult,
} from "@/actions/contents";
import type { CommunityExploreCatalogRow } from "@/actions/communities";
import { ContentCardSkeleton } from "./tv-loading-skeletons";
import { VirtualRail } from "./virtual-rail";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { isOptimizableImageSrc } from "@/lib/image-src";
import {
  DISCOVERY_TRENDING_SEARCHES,
  pushRecentDiscoverySearch,
  readRecentDiscoverySearches,
} from "@/lib/discovery-search-storage";
import { shouldApplyDiscoverSearchResult } from "@/lib/discover-search-generation";
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
import { isLiveStreamContent } from "@/lib/discover-content-routing";

const CONTENT_CARD_MIN = "min-w-[220px] sm:min-w-[270px] flex-shrink-0";
const PROGRAM_CARD_MIN = "min-w-[160px] sm:min-w-[220px] flex-shrink-0";

function RailCoverImage({
  src,
  alt,
  aspectClassName,
}: {
  src: string;
  alt: string;
  aspectClassName: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md",
        aspectClassName
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 220px, 270px"
        unoptimized={!isOptimizableImageSrc(src)}
      />
    </div>
  );
}

type SearchResultItem =
  | { kind: "video"; content: Content }
  | { kind: "program"; program: DiscoverySearchResult["programs"][number] }
  | { kind: "livestream"; stream: DiscoverySearchResult["livestreams"][number] }
  | {
      kind: "community";
      community: DiscoverySearchResult["communities"][number];
    };

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
  topCommunities?: CommunityExploreCatalogRow[];
  catalogLoading?: boolean;
  /** Pre-fill search (e.g. from Explore header). */
  initialSearchTerm?: string;
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
   * Routing surface (telemetry). Playback always targets Explore when
   * `onPlayInExplore` is provided.
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
      <div className="flex items-center gap-1">
        <h5 className="text-xl font-semibold">{title}</h5>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground inline-flex shrink-0 cursor-pointer rounded-full p-0.5 sm:hidden"
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

      <p className="text-muted-foreground text-sm">{subtitle}</p>
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
  topCommunities = [],
  catalogLoading = false,
  initialSearchTerm = "",
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
    defaultValues: { searchTerm: initialSearchTerm },
  });

  useEffect(() => {
    if (initialSearchTerm.trim()) {
      form.setValue("searchTerm", initialSearchTerm);
    }
  }, [initialSearchTerm, form]);

  const searchTerm = form.watch("searchTerm");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [discoveryResults, setDiscoveryResults] =
    useState<DiscoverySearchResult | null>(null);
  const [tagResults, setTagResults] = useState<Content[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tagLoading, setTagLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const searchRequestGenRef = useRef(0);
  const tagRequestGenRef = useRef(0);

  useEffect(() => {
    setRecentSearches(readRecentDiscoverySearches());
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      setSelectedTag(null);
    }
  }, [searchTerm]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      searchRequestGenRef.current += 1;
      setDiscoveryResults(null);
      setSearchLoading(false);
      return;
    }

    const gen = ++searchRequestGenRef.current;
    setSearchLoading(true);
    const t = window.setTimeout(() => {
      void discoverySearchAction(q, 30)
        .then(res => {
          if (
            !shouldApplyDiscoverSearchResult(gen, searchRequestGenRef.current)
          ) {
            return;
          }
          if (res.success && res.data) {
            pushRecentDiscoverySearch(q);
            setRecentSearches(readRecentDiscoverySearches());
          }
          setDiscoveryResults(res.success && res.data ? res.data : null);
        })
        .finally(() => {
          if (
            !shouldApplyDiscoverSearchResult(gen, searchRequestGenRef.current)
          ) {
            return;
          }
          setSearchLoading(false);
        });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedTag) {
      tagRequestGenRef.current += 1;
      setTagResults([]);
      setTagLoading(false);
      return;
    }

    const gen = ++tagRequestGenRef.current;
    setTagLoading(true);
    void discoverySearchAction("", 30, selectedTag)
      .then(res => {
        if (!shouldApplyDiscoverSearchResult(gen, tagRequestGenRef.current)) {
          return;
        }
        const videos = res.success && res.data?.videos ? res.data.videos : [];
        setTagResults(
          videos.map(v => ({
            id: v.id,
            title: v.title,
            url: v.url,
            event: {
              id: v.eventId,
              numOfTips: v.numOfTips,
              amountRaised: 0,
            },
          }))
        );
      })
      .catch(() => {
        if (!shouldApplyDiscoverSearchResult(gen, tagRequestGenRef.current)) {
          return;
        }
        setTagResults([]);
      })
      .finally(() => {
        if (!shouldApplyDiscoverSearchResult(gen, tagRequestGenRef.current)) {
          return;
        }
        setTagLoading(false);
      });
  }, [selectedTag]);

  const { push, prefetch } = useAppRouter();

  // Legacy /content and /channel navigation — disabled; Discover clips open in Explore.
  // const goToChannel = useCallback(
  //   (eventId: string) => {
  //     const href = `/content/${eventId}`;
  //     prefetch(href);
  //     push(href);
  //   },
  //   [push, prefetch]
  // );
  //
  // const openLiveStreamContent = useCallback(
  //   (content: Content) => {
  //     const eventId = content.event?.id;
  //     if (!eventId) return;
  //     const href = `/channel/${eventId}`;
  //     prefetch(href);
  //     push(href);
  //   },
  //   [push, prefetch]
  // );

  const playContentInExplore = useCallback(
    (content: Content) => {
      if (!onPlayInExplore) return;
      const eventId = content.event?.id;
      if (!eventId) return;
      onPlayInExplore({
        videoId: content.id,
        eventId,
        channelSnapshot: content as unknown as Record<string, unknown>,
      });
    },
    [onPlayInExplore]
  );

  const warmContentForExplore = useCallback(
    (content: Content) => {
      if (!onPlayInExplore) return;
      const eventId = content.event?.id;
      if (!eventId || !content.url?.trim()) return;
      warmExploreVideoHandoff({
        videoId: content.id,
        eventId,
        channelSnapshot: content as unknown as Record<string, unknown>,
      });
    },
    [onPlayInExplore]
  );

  const openDiscoverContent = useCallback(
    (content: Content) => {
      playContentInExplore(content);
    },
    [playContentInExplore]
  );

  const resolveContentClick = useCallback(
    (content: Content) => {
      openDiscoverContent(content);
    },
    [openDiscoverContent]
  );

  const hasDiscoveryResults = useMemo(() => {
    if (!discoveryResults) return false;
    return (
      discoveryResults.videos.length > 0 ||
      discoveryResults.programs.length > 0 ||
      discoveryResults.livestreams.length > 0 ||
      discoveryResults.communities.length > 0
    );
  }, [discoveryResults]);

  const flatSearchResults = useMemo((): SearchResultItem[] => {
    if (!discoveryResults) return [];
    const items: SearchResultItem[] = [];
    for (const video of discoveryResults.videos) {
      items.push({
        kind: "video",
        content: {
          id: video.id,
          title: video.title,
          url: video.url,
          event: { id: video.eventId },
        },
      });
    }
    for (const program of discoveryResults.programs) {
      items.push({ kind: "program", program });
    }
    for (const stream of discoveryResults.livestreams) {
      items.push({ kind: "livestream", stream });
    }
    for (const community of discoveryResults.communities) {
      items.push({ kind: "community", community });
    }
    return items;
  }, [discoveryResults]);

  useEffect(() => {
    setActiveSearchIndex(-1);
  }, [searchTerm, discoveryResults]);

  useEffect(() => {
    if (activeSearchIndex < 0 || !searchResultsRef.current) return;
    const el = searchResultsRef.current.querySelector(
      `[data-search-index="${activeSearchIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeSearchIndex]);

  const activateSearchResult = useCallback(
    (item: SearchResultItem) => {
      if (item.kind === "video") {
        resolveContentClick(item.content);
        return;
      }
      if (item.kind === "program") {
        const href = item.program.landingUrl ?? `/program/${item.program.id}`;
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      if (item.kind === "livestream") {
        playContentInExplore({
          id: item.stream.id,
          title: item.stream.title,
          url: "",
          event: { id: item.stream.eventId },
        });
        return;
      }
      const href = exploreCommunityJoinHref(item.community.id);
      prefetch(href);
      push(href);
    },
    [resolveContentClick, prefetch, push, playContentInExplore]
  );

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
  const recentPrograms = useMemo(
    () => takeRecentDiscoveryPrograms(programs),
    [programs]
  );
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
      <span className="text-muted-foreground inline-flex w-52 items-center gap-1 text-[10px] sm:w-64">
        <Radio
          className="size-4 shrink-0"
          aria-hidden
        />
        <span className="break-words">{copy}</span>
      </span>
    );
  };

  const disableInlinePlaybackForHandoff = Boolean(onPlayInExplore);

  const renderContentCard = (content: Content, minWidth = CONTENT_CARD_MIN) => (
    <div
      key={content.id}
      data-testid="discover-content-card"
      onPointerEnter={() => warmContentForExplore(content)}
      onClick={() => resolveContentClick(content)}
      className={cn(
        "relative flex cursor-pointer gap-1 rounded-md border-2 bg-gray-200",
        minWidth
      )}
    >
      <div className="space-y-1">
        <ThumbnailPlayer
          videoUrl={content.url}
          contentId={content.id}
          suppressInlinePlaybackContentId={suppressInlinePlaybackContentId}
          disableInlinePlayback={disableInlinePlaybackForHandoff}
          className="w-64 rounded-md sm:w-80"
        />

        <div className="space-y-1 p-2">
          <h5 className="line-clamp-1 text-sm">
            {trimTitle(content.title, 30)}
          </h5>

          {renderLiveRoomCue(content)}

          <div className="text-muted-foreground flex items-center gap-4 text-xs">
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

  const topCommunitiesRef = useRef<HTMLDivElement>(null);

  const tipperSkeleton = (
    <div className="mt-4 mb-8 flex flex-wrap items-center gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <ContentCardSkeleton
          key={i}
          className="min-w-[140px]"
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
        <h2 className="text-lg font-semibold lg:text-2xl">Discover contents</h2>
      ) : null}

      {/* CONTENT SEARCH */}
      <Form {...form}>
        <form onSubmit={() => {}}>
          <FormField
            control={form.control}
            name="searchTerm"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-center gap-2">
                  <FormControl className="relative flex-1">
                    <div className="relative">
                      <Input
                        placeholder="Search..."
                        autoComplete="off"
                        aria-label="Search discovery catalogue"
                        onKeyDown={e => {
                          if (e.key === "Escape") {
                            form.setValue("searchTerm", "");
                            setDiscoveryResults(null);
                            setActiveSearchIndex(-1);
                            return;
                          }
                          if (!flatSearchResults.length) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setActiveSearchIndex(i =>
                              Math.min(i + 1, flatSearchResults.length - 1)
                            );
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setActiveSearchIndex(i => Math.max(i - 1, 0));
                            return;
                          }
                          if (e.key === "Enter" && activeSearchIndex >= 0) {
                            e.preventDefault();
                            const item = flatSearchResults[activeSearchIndex];
                            if (item) activateSearchResult(item);
                          }
                        }}
                        {...field}
                      />
                      <Search className="absolute top-1/2 right-2 -translate-y-1/2" />
                    </div>
                  </FormControl>

                  {onOpenBookmarks ? (
                    <button
                      type="button"
                      onClick={onOpenBookmarks}
                      aria-label="Open bookmarks"
                    >
                      <Bookmark />
                    </button>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">
                  Looking for an event?{" "}
                  <Link
                    href="/join"
                    className="text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Find Event here
                  </Link>
                </p>

                {!searchTerm.trim() && !hasDiscoveryResults ? (
                  <div className="space-y-4">
                    {recentSearches.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground text-xs font-medium">
                          Recent
                        </span>

                        {recentSearches.map(term => (
                          <button
                            key={term}
                            type="button"
                            className="cursor-pointer rounded-md bg-gray-200 px-2 py-0.5 text-xs hover:bg-black hover:text-white"
                            onClick={() => form.setValue("searchTerm", term)}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground text-xs font-medium">
                        Trending
                      </span>

                      {DISCOVERY_TRENDING_SEARCHES.map(term => (
                        <button
                          key={term}
                          type="button"
                          className="cursor-pointer rounded-md bg-gray-200 px-2 py-0.5 text-xs hover:bg-black hover:text-white"
                          onClick={() => form.setValue("searchTerm", term)}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </FormItem>
            )}
          />
        </form>
      </Form>

      {/* CONTENT TAGS */}
      <div className="hide__scrollbar flex gap-1.5 overflow-x-auto">
        {EXPLORE_EVENT_TYPE_OPTIONS.map(opt => {
          const isSelected = selectedTag === opt.value;
          const tagClassName = cn(
            "rounded-md px-2 py-1 text-xs shrink-0 cursor-pointer hover:bg-black hover:text-white",
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

      <div className="space-y-6 overflow-y-auto pb-8">
        {searchTerm && (
          <div className="space-y-4">
            <h5 className="font-semibold">
              Search results for &apos;{searchTerm}&apos;
            </h5>

            {searchLoading ? (
              carouselSkeleton
            ) : !hasDiscoveryResults ? (
              <p className="text-muted-foreground text-sm">No results found.</p>
            ) : (
              <div
                ref={searchResultsRef}
                className="space-y-4"
              >
                {(() => {
                  let searchIdx = 0;
                  return (
                    <>
                      {discoveryResults!.videos.length > 0 ? (
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium">Videos</h6>
                          <VirtualRail
                            items={discoveryResults!.videos}
                            getItemKey={video => video.id}
                            itemMinClassName={CONTENT_CARD_MIN}
                            renderItem={video => {
                              const idx = searchIdx++;
                              const content: Content = {
                                id: video.id,
                                title: video.title,
                                url: video.url,
                                event: { id: video.eventId },
                              };
                              return (
                                <div
                                  data-search-index={idx}
                                  className={cn(
                                    idx === activeSearchIndex &&
                                      "ring-primary rounded-md ring-2"
                                  )}
                                >
                                  {renderContentCard(content)}
                                </div>
                              );
                            }}
                          />
                        </div>
                      ) : null}

                      {discoveryResults!.programs.length > 0 ? (
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium">Programs</h6>
                          <VirtualRail
                            items={discoveryResults!.programs}
                            getItemKey={program => program.id}
                            itemMinClassName={PROGRAM_CARD_MIN}
                            renderItem={program => {
                              const idx = searchIdx++;
                              return (
                                <Link
                                  href={
                                    program.landingUrl ??
                                    `/program/${program.id}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-search-index={idx}
                                  className={cn(
                                    "rounded-md border bg-black/10 p-2",
                                    PROGRAM_CARD_MIN,
                                    idx === activeSearchIndex &&
                                      "ring-primary ring-2"
                                  )}
                                >
                                  {program.imageUrl ? (
                                    <RailCoverImage
                                      src={program.imageUrl}
                                      alt={program.title}
                                      aspectClassName="aspect-video"
                                    />
                                  ) : (
                                    <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-md">
                                      <Tv className="size-8 text-neutral-500" />
                                    </div>
                                  )}
                                  <p className="mt-2 text-sm font-medium">
                                    {program.title}
                                  </p>
                                </Link>
                              );
                            }}
                          />
                        </div>
                      ) : null}

                      {discoveryResults!.livestreams.length > 0 ? (
                        <div className="space-y-2">
                          <h5 className="text-sm font-semibold">
                            Live streams
                          </h5>

                          <VirtualRail
                            items={discoveryResults!.livestreams}
                            getItemKey={stream => stream.id}
                            itemMinClassName={CONTENT_CARD_MIN}
                            renderItem={stream => {
                              const idx = searchIdx++;
                              return (
                                <button
                                  type="button"
                                  data-testid="discover-live-stream-card"
                                  data-search-index={idx}
                                  onClick={() =>
                                    playContentInExplore({
                                      id: stream.id,
                                      title: stream.title,
                                      url: "",
                                      liveStatus: stream.liveStatus,
                                      event: { id: stream.eventId },
                                    })
                                  }
                                  className={cn(
                                    "relative block text-left",
                                    CONTENT_CARD_MIN,
                                    idx === activeSearchIndex &&
                                      "ring-primary rounded-md ring-2"
                                  )}
                                >
                                  <div className="bg-black/10">
                                    {stream.thumbnailUrl ? (
                                      <RailCoverImage
                                        src={stream.thumbnailUrl}
                                        alt={stream.title}
                                        aspectClassName="aspect-video"
                                      />
                                    ) : (
                                      <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-md">
                                        <Radio className="size-8 text-neutral-500" />
                                      </div>
                                    )}

                                    <div className="p-1">
                                      <h5 className="text-sm">
                                        {stream.title}
                                      </h5>
                                      <span className="text-muted-foreground mt-1 inline-flex items-center gap-1 text-[10px]">
                                        <Radio
                                          className="size-3"
                                          aria-hidden
                                        />
                                        {stream.liveStatus}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            }}
                          />
                        </div>
                      ) : null}

                      {discoveryResults!.communities.length > 0 ? (
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium">Communities</h6>
                          <VirtualRail
                            items={discoveryResults!.communities}
                            getItemKey={community => community.id}
                            itemMinClassName={PROGRAM_CARD_MIN}
                            renderItem={community => {
                              const idx = searchIdx++;
                              return (
                                <Link
                                  href={exploreCommunityJoinHref(community.id)}
                                  data-search-index={idx}
                                  className={cn(
                                    "rounded-md border bg-black/10 p-2",
                                    PROGRAM_CARD_MIN,
                                    idx === activeSearchIndex &&
                                      "ring-primary ring-2"
                                  )}
                                >
                                  {community.logoUrl ? (
                                    <div className="relative size-12 overflow-hidden rounded-md">
                                      <Image
                                        src={community.logoUrl}
                                        alt={community.name}
                                        fill
                                        className="object-cover"
                                        sizes="48px"
                                        unoptimized={
                                          !isOptimizableImageSrc(
                                            community.logoUrl
                                          )
                                        }
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-muted flex size-12 items-center justify-center rounded-md">
                                      <UsersRound className="size-6 text-neutral-500" />
                                    </div>
                                  )}
                                  <p className="mt-2 text-sm font-medium">
                                    {community.name}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    {community.memberCount} members · £
                                    {community.totalTips} tips
                                  </p>
                                </Link>
                              );
                            }}
                          />
                        </div>
                      ) : null}
                    </>
                  );
                })()}
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
                      onPointerEnter={() => warmContentForExplore(content)}
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
                        disableInlinePlayback={disableInlinePlaybackForHandoff}
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
            {catalogLoading && contents.length === 0 ? (
              carouselSkeleton
            ) : (
              <VirtualRail
                containerRef={topContentsRef}
                items={contents as Content[]}
                getItemKey={content => content.id}
                itemMinClassName={CONTENT_CARD_MIN}
                gapClassName="gap-6"
                renderItem={content => renderContentCard(content)}
              />
            )}

            <button
              type="button"
              onClick={() => scrollNext(topContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/70"
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
              className="scrollbar-none hide__scrollbar overflow-x-auto"
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
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/70"
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
              className="scrollbar-none hide__scrollbar overflow-x-auto"
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
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/70"
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
              className="scrollbar-none hide__scrollbar overflow-x-auto"
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
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* TOP COMMUNITIES */}
        {topCommunities.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h5 className="text-xl font-semibold">Top communities</h5>
              <p className="text-muted-foreground text-xs">
                Ranked by total tips across approved bank videos.
              </p>
            </div>

            <div className="relative">
              <VirtualRail
                containerRef={topCommunitiesRef}
                items={topCommunities}
                getItemKey={community => community.id}
                itemMinClassName={PROGRAM_CARD_MIN}
                renderItem={community => (
                  <Link
                    href={exploreCommunityJoinHref(community.id)}
                    className={cn(
                      "border-moonstone-blue flex flex-col items-center justify-center gap-2 rounded-md border-2 bg-gray-100 p-4",
                      PROGRAM_CARD_MIN
                    )}
                  >
                    {community.logoUrl ? (
                      <div className="relative size-12 overflow-hidden rounded-md">
                        <Image
                          src={community.logoUrl}
                          alt={community.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={
                            !isOptimizableImageSrc(community.logoUrl)
                          }
                        />
                      </div>
                    ) : (
                      <div className="border-moonstone-blue flex size-12 items-center justify-center rounded-md border-2 bg-white">
                        <UsersRound className="size-6" />
                      </div>
                    )}

                    <h5 className="text-sm font-semibold">{community.name}</h5>

                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {trimTitle(community.description ?? "", 20)}
                    </p>

                    <p className="text-muted-foreground text-xs">
                      £{community.totalTips} tips &middot;{" "}
                      {community.memberCount} member
                      {community.memberCount > 1 ? "s" : ""}
                    </p>
                  </Link>
                )}
              />
              <button
                type="button"
                onClick={() => scrollNext(topCommunitiesRef)}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/70"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        ) : null}

        {/* PROGRAMS */}
        <div className="space-y-4">
          <DiscoverRailHeading
            title="Programs"
            railKey="programs"
          />
          <div className="relative">
            <div
              ref={programsRef}
              className="scrollbar-none hide__scrollbar overflow-x-auto"
            >
              <div className="flex gap-4">
                {catalogLoading && recentPrograms.length === 0 ? (
                  carouselSkeleton
                ) : recentPrograms.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No active programs right now.
                  </p>
                ) : (
                  recentPrograms.map(program => (
                    <Link
                      key={program.id}
                      href={program.landingUrl ?? `/program/${program.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "rounded-md border bg-gray-200 p-2",
                        PROGRAM_CARD_MIN
                      )}
                    >
                      {program.imageUrl ? (
                        <RailCoverImage
                          src={program.imageUrl}
                          alt={program.title}
                          aspectClassName="aspect-video"
                        />
                      ) : (
                        <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-md">
                          <Tv className="size-8 text-neutral-500" />
                        </div>
                      )}

                      <div className="sapce-y-1 p-2">
                        <h5 className="line-clamp-1 text-sm font-medium">
                          {trimTitle(program.title, 30)}
                        </h5>

                        <p className="text-muted-foreground text-xs capitalize">
                          Scheduled:{" "}
                          {formatProgramScheduleDisplay(program.scheduledAt)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
            {recentPrograms.length > 0 ? (
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
              className="scrollbar-none hide__scrollbar overflow-x-auto"
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
                        onPointerEnter={() => warmContentForExplore(content)}
                        onClick={() => resolveContentClick(content)}
                      >
                        {content.liveLabel ? (
                          <span className="bg-destructive absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-white uppercase">
                            <Radio className="size-4" />
                            {content.liveLabel}
                          </span>
                        ) : null}

                        <div className="cursor-pointer rounded-md bg-gray-200">
                          <ThumbnailPlayer
                            videoUrl={content.url}
                            contentId={content.id}
                            suppressInlinePlaybackContentId={
                              suppressInlinePlaybackContentId
                            }
                            disableInlinePlayback={
                              disableInlinePlaybackForHandoff
                            }
                            className="aspect-video w-64 rounded-md sm:w-80"
                          />

                          <div className="space-y-1 p-2">
                            <h5 className="line-clamp-1 text-sm">
                              {trimTitle(content.title, 30)}
                            </h5>

                            {renderLiveRoomCue(content)}

                            <div className="text-muted-foreground flex items-center gap-4 text-xs">
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
                    )
                  )
                )}
              </div>
            </div>
            {liveStreamItems.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollNext(liveStreamsRef)}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-black p-2 text-white hover:bg-black/70"
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
            {catalogLoading && mostTippedContents.length === 0 ? (
              carouselSkeleton
            ) : (
              <VirtualRail
                containerRef={mostTippedContentsRef}
                items={mostTippedContents as Content[]}
                getItemKey={content => content.id}
                itemMinClassName={CONTENT_CARD_MIN}
                renderItem={content => (
                  <div
                    onPointerEnter={() => warmContentForExplore(content)}
                    onClick={() => resolveContentClick(content)}
                    className={cn(
                      "cursor-pointer rounded-md bg-gray-200",
                      CONTENT_CARD_MIN
                    )}
                  >
                    <ThumbnailPlayer
                      videoUrl={content.url}
                      contentId={content.id}
                      suppressInlinePlaybackContentId={
                        suppressInlinePlaybackContentId
                      }
                      disableInlinePlayback={disableInlinePlaybackForHandoff}
                      className="aspect-video w-64 rounded-md sm:w-80"
                    />

                    <div className="space-y-1 p-2">
                      <h5 className="line-clamp-1 text-sm">
                        {trimTitle(content.title, 30)}
                      </h5>

                      {renderLiveRoomCue(content)}

                      <div className="text-muted-foreground flex items-center gap-4 text-xs">
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
                )}
              />
            )}

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

          {catalogLoading && tippers.length === 0 ? (
            tipperSkeleton
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
