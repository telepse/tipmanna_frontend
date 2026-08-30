"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

import { postExploreFeedBatchAction } from "@/actions/contents";
import { ContentCardSkeleton } from "./content-card-skeleton";
import { ThumbnailPlayer } from "./thumbnail-player";
import { TV_EVENT_VIDEO_TYPE_TAGS } from "./tv-event-video-type-tags";
import { Content } from "@/types/content.types";
import { ExploreFeedOpenTarget } from "@/lib/explore-feed-open";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";

type FeedItem = {
  id: string;
  url: string;
  title?: string;
  event?: {
    id?: string;
    eventName?: string;
    title?: string;
    numOfTips?: number;
    amountRaised?: number;
  };
};

function feedItemTitle(item: FeedItem): string {
  return item.title ?? item.event?.title ?? item.event?.eventName ?? "Video";
}

type Props = {
  videoType: string;
  onPlayInExplore?: (target: ExploreFeedOpenTarget) => void;
};

export function EventVideoTypeContentsPanel({
  videoType,
  onPlayInExplore,
}: Props) {
  const navigateToExplore = useNavigateToExploreVideo();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const label =
    TV_EVENT_VIDEO_TYPE_TAGS.find(t => t.value === videoType)?.label ??
    videoType;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);

    void (async () => {
      const res = await postExploreFeedBatchAction([], undefined, 15, null, {
        feedMode: "trends",
        eventVideoTypes: [videoType],
      });
      if (cancelled) return;
      const raw = res.success ? res.data?.items : [];
      setItems(Array.isArray(raw) ? (raw as FeedItem[]) : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [videoType]);

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  // const goToChannel = useCallback(
  //   (eventId: string) => {
  //     const href = `/content/${eventId}`;
  //     prefetch(href);
  //     push(href);
  //   },
  //   [push, prefetch]
  // );

  const openDiscoverContent = useCallback(
    (content: Content) => {
      if (onPlayInExplore) {
        onPlayInExplore({
          videoId: content.id,
          eventId: content?.event?.id ?? "",
          channelSnapshot: content as unknown as Record<string, unknown>,
        });
        return;
      }
      navigateToExplore(content);
    },
    [onPlayInExplore, navigateToExplore]
  );

  const [suppressDiscoverInlineContentId, setSuppressDiscoverInlineContentId] =
    useState<string | null>(null);

  useEffect(() => {
    if (videoType) {
      setSuppressDiscoverInlineContentId(null);
    } else {
      setSuppressDiscoverInlineContentId(videoType);
    }
  }, [videoType]);

  return (
    <div className="space-y-4">
      <h5 className="font-semibold">{label}</h5>

      {loading ? (
        <div className="flex gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <ContentCardSkeleton key={idx} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No videos found for this category.
        </p>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="hide__scrollbar scrollbar-none overflow-x-auto"
          >
            <div className="flex gap-6">
              {items.map(item => {
                const eventId = item.event?.id;
                if (!item.url || !eventId) return null;

                return (
                  <div
                    key={item.id}
                    onClick={() => openDiscoverContent(item as Content)}
                    className="relative flex min-w-[200px] cursor-pointer gap-1 border-2 bg-black/10"
                  >
                    <div className="space-y-1">
                      <ThumbnailPlayer
                        videoUrl={item.url}
                        contentId={item.id}
                        suppressInlinePlaybackContentId={
                          suppressDiscoverInlineContentId
                        }
                        disableInlinePlayback
                        className="aspect-video w-full rounded-md"
                      />

                      <div className="p-1">
                        <h5 className="text-sm">{feedItemTitle(item)}</h5>

                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 text-xs">
                            <UsersRound className="size-4" />
                            {item.event?.numOfTips ?? 0} Tips
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <Sparkles className="size-4" /> &pound;
                            {item.event?.amountRaised ?? 0} raised
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={scrollNext}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
