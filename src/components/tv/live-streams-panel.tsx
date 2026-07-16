/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef } from "react";

import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

import { Content } from "@/types/content.types";
import { ThumbnailPlayer } from "./thumbnail-player";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";

type LiveStreams = {
  upcoming: Content[];
  live: Content[];
  recentlyEnded: Content[];
};

export const LiveStreamsPanel = ({
  liveStreams,
}: {
  liveStreams: LiveStreams;
}) => {
  const navigateToExplore = useNavigateToExploreVideo();
  const liveStreamsRef = useRef<HTMLDivElement>(null);

  const scrollNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      <h5 className="font-semibold">Live streams</h5>

      <div className="relative">
        <div
          ref={liveStreamsRef}
          className="hide__scrollbar scrollbar-none overflow-x-auto"
        >
          <div className="flex gap-6">
            {[
              ...liveStreams.live.map(content => ({
                ...content,
                streamStatus: "Live",
              })),
              ...liveStreams.upcoming.map(content => ({
                ...content,
                streamStatus: "Upcoming",
              })),
              ...liveStreams.recentlyEnded.map(content => ({
                ...content,
                streamStatus: "Recently Ended",
              })),
            ].map((content: any) => (
              <div
                key={content.id}
                role="button"
                tabIndex={0}
                onClick={() => navigateToExplore(content)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigateToExplore(content);
                  }
                }}
                className="relative flex min-w-[200px] cursor-pointer gap-1 border-2 bg-black/10"
              >
                {/* Status badge */}
                <span
                  className={`absolute top-2 left-2 z-10 rounded-full px-2 py-1 text-xs font-medium ${
                    content.streamStatus === "Live"
                      ? "bg-red-600 text-white"
                      : content.streamStatus === "Upcoming"
                        ? "bg-blue-600 text-white"
                        : content.streamStatus === "Recently Ended"
                          ? "bg-destructive text-white"
                          : "bg-gray-700 text-white"
                  }`}
                >
                  {content.streamStatus}
                </span>

                <div className="space-y-1">
                  <ThumbnailPlayer
                    videoUrl={content.url}
                    contentId={content.id}
                    suppressInlinePlaybackContentId={null}
                    disableInlinePlayback
                    className="aspect-video w-full rounded-md"
                  />

                  <div className="p-1">
                    <h5 className="text-sm">{content.title}</h5>

                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1 text-xs">
                        <UsersRound className="size-4" />
                        {content.event?.numOfTips ?? 0} Tips
                      </span>

                      <span className="flex items-center gap-1 text-xs">
                        <Sparkles className="size-4" />
                        &pound;{content.event?.amountRaised ?? 0} raised
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {liveStreams && (
          <button
            type="button"
            onClick={() => scrollNext(liveStreamsRef)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
