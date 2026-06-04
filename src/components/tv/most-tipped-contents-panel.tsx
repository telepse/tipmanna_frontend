import { useEffect, useRef, useState } from "react";

// Third-party imports
import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

// Local imports
import { getMostTippedContents } from "@/actions/contents";
import { Content } from "@/types/content.types";
import { ThumbnailPlayer } from "./thumbnail-player";

export const MostTippedContentsPanel = () => {
  const mostTippedContentsRef = useRef<HTMLDivElement>(null);
  const [mostTippedContents, setMostTippedContents] = useState<Content[]>([]);

  useEffect(() => {
    const fetchMostTippedContents = async () => {
      const res = await getMostTippedContents();
      setMostTippedContents(res.data as Content[]);
    };
    fetchMostTippedContents();
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
          ref={mostTippedContentsRef}
          className="scrollbar-none overflow-x-auto"
        >
          <div className="flex gap-6">
            {mostTippedContents.map((content: Content) => (
              <div
                key={content.id}
                // onClick={() => openDiscoverContent(content)}
                className="relative flex min-w-[270px] cursor-pointer gap-1 border-2 bg-black/10"
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
          onClick={() => scrollNext(mostTippedContentsRef)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
