"use client";

import { useEffect, useRef, useState } from "react";

// Third-party imports
import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

// Local imports
import { getRecommendedContents } from "@/actions/contents";
import { Content } from "@/types/content.types";
import { ThumbnailPlayer } from "./thumbnail-player";
import { useNavigateToExploreVideo } from "@/hooks/use-navigate-to-explore-video";

export const RecommendedForYouPanel = () => {
  const navigateToExplore = useNavigateToExploreVideo();
  const recommendedContentsRef = useRef<HTMLDivElement>(null);
  const [recommendedContents, setRecommendedContents] = useState<Content[]>([]);

  useEffect(() => {
    const fetchRecommendedContents = async () => {
      const res = await getRecommendedContents();
      setRecommendedContents(res.data as Content[]);
    };
    void fetchRecommendedContents();
  }, []);

  const scrollNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      <h5 className="font-semibold">Recommended for you</h5>

      <div className="relative">
        <div
          ref={recommendedContentsRef}
          className="scrollbar-none overflow-x-auto"
        >
          <div className="flex gap-6">
            {recommendedContents.map((content: Content) => (
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
                className="relative flex min-w-[270px] cursor-pointer gap-1 border-2 bg-black/10"
              >
                <div className="space-y-1">
                  <ThumbnailPlayer
                    videoUrl={content.url}
                    contentId={content.id}
                    suppressInlinePlaybackContentId={null}
                    disableInlinePlayback
                    className="aspect-video w-full rounded-md"
                  />

                  <div className="p-1">
                    <h5 className="text-sm">{content.event?.title}</h5>

                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <UsersRound className="size-4" />
                        {content?.event?.numOfTips
                          ? content?.event?.numOfTips
                          : 0}{" "}
                        Tips
                      </span>{" "}
                      <span className="flex items-center gap-2">
                        <Sparkles className="size-4" /> &pound;
                        {content?.event?.amountRaised
                          ? content?.event?.amountRaised
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
          onClick={() => scrollNext(recommendedContentsRef)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
