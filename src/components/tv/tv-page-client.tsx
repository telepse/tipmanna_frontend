/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, Sparkles, UsersRound } from "lucide-react";

// Lcal imports
import { ThumbnailPlayer } from "./thumbnail-player";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ContentCardSkeleton } from "./content-card-skeleton";

interface Props {
  channels: any[];
  currentPlayingIndex?: number;
  contents: any[];
  tippers: any[];
  tipperEvents: any[];
  iTipped: number;
  causes: any[];
  latestContents: any[];
  mostTippedContents: any[];
  selectedTag: string | null;
  tagFilteredContents: any[];
}

function trimTitle(title: string, maxLength = 20): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + "...";
}

export const TVPageClient = ({
  channels,
  currentPlayingIndex,
  contents,
  tippers,
  tipperEvents,
  iTipped,
  causes,
  latestContents,
  mostTippedContents,
  selectedTag,
  tagFilteredContents,
}: Props) => {
  const router = useRouter();

  const goToChannel = (eventId: string, frameId: string) => {
    router.push(`/room/${eventId}?frame=${frameId}`);
  };

  const topContentsRef = useRef<HTMLDivElement>(null);
  const latestContentsRef = useRef<HTMLDivElement>(null);
  const spotlightContentsRef = useRef<HTMLDivElement>(null);
  const mostTippedContentsRef = useRef<HTMLDivElement>(null);

  const scrollNext = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  const displayedContents = selectedTag ? tagFilteredContents : contents;

  return (
    <>
      {selectedTag && (
        <div className="space-y-4">
          <h5 className="font-semibold">
            Search results for &apos;{selectedTag}&apos;
          </h5>

          {displayedContents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No results found.</p>
          ) : (
            <div className="scrollbar-none overflow-x-auto">
              <div className="flex gap-4">
                {tagFilteredContents.map(content => (
                  <div
                    key={content.id}
                    onClick={() => goToChannel(content.event.id, content.id)}
                    className="min-w-[270px] flex-shrink-0 bg-black/10"
                  >
                    <ThumbnailPlayer
                      videoUrl={content.url}
                      className="aspect-video w-full rounded-md"
                    />

                    <div className="p-1">
                      <h5 className="text-sm">{content.title}</h5>

                      <div className="text-muted-foreground flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          {content.event.numOfTips} Tips
                        </span>
                        <span>&pound; {content.event.amountRaised} raised</span>
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
      <>
        <h5 className="font-semibold">Top contents</h5>

        <div className="relative">
          <div
            ref={topContentsRef}
            className="scrollbar-none overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : contents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id, content.id)}
                      className="relative flex min-w-[200px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-1">
                          <h5 className="text-sm">
                            {trimTitle(content.title)}
                          </h5>

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
                    </div>
                  ))}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scrollNext(topContentsRef)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </>

      {/* LATEST CONTENTS */}
      <>
        <h5 className="font-semibold">Latest contents</h5>

        <div className="relative">
          <div
            ref={latestContentsRef}
            className="scrollbar-none overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : latestContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id, content.id)}
                      className="relative flex min-w-[200px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-1">
                          <h5 className="text-sm">
                            {trimTitle(content.title)}
                          </h5>

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
                    </div>
                  ))}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scrollNext(latestContentsRef)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </>

      {/* SPOTLIGHT */}
      <>
        <h5 className="font-semibold">Spotlight</h5>

        <div className="relative">
          <div
            ref={spotlightContentsRef}
            className="scrollbar-none overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : latestContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id, content.id)}
                      className="relative flex min-w-[200px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-1">
                          <h5 className="text-sm">
                            {trimTitle(content.title)}
                          </h5>

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
                    </div>
                  ))}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scrollNext(spotlightContentsRef)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </>

      {/* MOST TIPPED CONTENTS */}
      <>
        <h5 className="font-semibold">Most tipped contents</h5>

        <div className="relative">
          <div
            ref={mostTippedContentsRef}
            className="scrollbar-none overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : mostTippedContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id, content.id)}
                      className="relative flex min-w-[200px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-1">
                          <h5 className="text-sm">
                            {trimTitle(content.title)}
                          </h5>

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
                    </div>
                  ))}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scrollNext(mostTippedContentsRef)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </>
    </>
  );
};
