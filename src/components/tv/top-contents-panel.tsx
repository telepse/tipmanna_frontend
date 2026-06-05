import { useEffect, useRef, useState } from "react";

// Third-party imports
import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

// Local imports
import { getMostTippedContents } from "@/actions/contents";
import { Content } from "@/types/content.types";
import { ContentCardSkeleton } from "./content-card-skeleton";
import { ThumbnailPlayer } from "./thumbnail-player";

export const TopContentsPanel = () => {
  const topContentsRef = useRef<HTMLDivElement>(null);
  const [topContents, setTopContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchTopContents = async () => {
      const res = await getMostTippedContents();
      if (cancelled) return;
      setTopContents(res.data as Content[]);
      setLoading(false);
    };

    void fetchTopContents();

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-4">
      <h5 className="font-semibold">Top contents</h5>

      <div className="relative">
        <div
          ref={topContentsRef}
          className="hide__scrollbar scrollbar-none overflow-x-auto"
        >
          <div className="flex gap-6">
            {loading
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <ContentCardSkeleton key={idx} />
                ))
              : topContents.map((content: Content) => (
                  <div
                    key={content.id}
                    className="relative flex min-w-[200px] cursor-pointer gap-1 border-2 bg-black/10"
                  >
                    <div className="space-y-1">
                      <ThumbnailPlayer
                        videoUrl={content.url}
                        contentId={content.id}
                        suppressInlinePlaybackContentId={null}
                        className="aspect-video w-full rounded-md"
                      />

                      <div className="p-1">
                        <h5 className="text-sm">{content.event?.title}</h5>

                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <span className="flex items-center gap-1 text-xs">
                            <UsersRound className="size-4" />
                            {content?.event?.numOfTips
                              ? content?.event?.numOfTips
                              : 0}{" "}
                            Tips
                          </span>{" "}
                          <span className="flex items-center gap-1 text-xs">
                            <Sparkles className="size-4" /> &pound;
                            {content?.event?.amountRaised
                              ? content?.event.amountRaised
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

        {!loading && topContents.length > 0 ? (
          <button
            type="button"
            onClick={() => scrollNext(topContentsRef)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        ) : null}
      </div>
    </div>
  );
};
