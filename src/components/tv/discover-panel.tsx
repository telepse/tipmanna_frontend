/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";

// Third-party imports
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Bookmark, ChevronRight, Sparkles, UsersRound } from "lucide-react";

// Local imports
import { ThumbnailPlayer } from "./thumbnail-player";
import { cn } from "@/lib/utils";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";
import type { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { Button } from "../ui/button";
import { useMediaQuery } from "react-responsive";
import Link from "next/link";

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
  mostTippedContents: any[];
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
  mostTippedContents,
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

  const filteredContents = useMemo(
    () =>
      contents.filter(content =>
        content.title.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [contents, searchTerm]
  );

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
  const mostTippedContentsRef = useRef<HTMLDivElement>(null);

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
                {latestContents.map((content: Content) => (
                  <div
                    key={content.id}
                    onClick={() => openDiscoverContent(content)}
                    className="relative flex min-w-[270px] cursor-pointer gap-1 border-2 bg-black/10"
                  >
                    <div className="space-y-1">
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
                            {content.event.numOfTips
                              ? content.event.numOfTips
                              : 0}{" "}
                            Tips
                          </span>{" "}
                          <span className="flex items-center gap-2">
                            <Sparkles className="size-4" /> &pound;
                            {content.event.amountRaised
                              ? content.event.amountRaised
                              : 0}{" "}
                            raised
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                {latestContents.map((content: Content) => (
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
                {latestContents.map((content: Content) => (
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
              onClick={() => scrollNext(spotlightContentsRef)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
            >
              <ChevronRight size={24} />
            </button>
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
