"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

import { getSavedVideosForTipper } from "@/actions/events";
import { ContentCardSkeleton } from "./content-card-skeleton";
import { ThumbnailPlayer } from "./thumbnail-player";
import { normalizeSavedVideosList } from "@/lib/save-video-client";
import type { RootState } from "@/redux/store";

type SavedVideoItem = {
  id?: string;
  channelId?: string;
  channel?: {
    id?: string;
    url?: string;
    title?: string;
    event?: {
      id?: string;
      eventName?: string;
      numOfTips?: number;
      amountRaised?: number;
    };
  };
};

export function SavedContentsPanel() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [savedVideos, setSavedVideos] = useState<SavedVideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedVideos([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const res = await getSavedVideosForTipper();
      if (cancelled) return;
      setSavedVideos(
        res.success
          ? (normalizeSavedVideosList(res.data) as SavedVideoItem[])
          : []
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <h5 className="font-semibold">Saved</h5>

      {!isAuthenticated ? (
        <p className="text-muted-foreground text-sm">
          <Link
            href="/login"
            className="underline"
          >
            Sign in
          </Link>{" "}
          to view your saved videos.
        </p>
      ) : loading ? (
        <div className="flex gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <ContentCardSkeleton key={idx} />
          ))}
        </div>
      ) : savedVideos.length === 0 ? (
        <p className="text-muted-foreground text-sm">No saved videos yet.</p>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="hide__scrollbar scrollbar-none overflow-x-auto"
          >
            <div className="flex gap-6">
              {savedVideos.map(item => {
                const channel = item.channel;
                const eventId = channel?.event?.id;
                if (!channel?.url || !eventId) return null;

                return (
                  <Link
                    key={item.id ?? item.channelId ?? channel.id}
                    href={`/content/${eventId}`}
                    className="relative flex min-w-[200px] cursor-pointer gap-1 border-2 bg-black/10"
                  >
                    <div className="space-y-1">
                      <ThumbnailPlayer
                        videoUrl={channel.url}
                        contentId={channel.id ?? item.channelId ?? item.id ?? ""}
                        suppressInlinePlaybackContentId={null}
                        className="aspect-video w-full rounded-md"
                      />

                      <div className="p-1">
                        <h5 className="text-sm">
                          {channel.title ?? channel.event?.eventName ?? "Video"}
                        </h5>

                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 text-xs">
                            <UsersRound className="size-4" />
                            {channel.event?.numOfTips ?? 0} Tips
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            <Sparkles className="size-4" /> &pound;
                            {channel.event?.amountRaised ?? 0} raised
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
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
