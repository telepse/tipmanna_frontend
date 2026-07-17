/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight, Sparkles, UsersRound, X } from "lucide-react";

// Lcal imports
import { ThumbnailPlayer } from "./thumbnail-player";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ContentCardSkeleton } from "./content-card-skeleton";
import { useTV } from "../tv-provider";
import { getSavedVideosForTipper } from "@/actions/events";
import type { RootState } from "@/redux/store";

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
  contents,
  tippers,
  latestContents,
  mostTippedContents,
  selectedTag,
  tagFilteredContents,
}: Props) => {
  const router = useRouter();

  const goToChannel = (eventId: string) => {
    router.push(`/content/${eventId}`);
  };

  const { registerSection } = useTV();

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

  const userId = useSelector((s: RootState) => s.auth.user?.id);

  const [savedVideos, setSavedVideos] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      const res = await getSavedVideosForTipper();
      setSavedVideos((res.data as any[]) || []);
    };
    void fetchData();
  }, [userId]);

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
                {displayedContents.map(content => (
                  <div
                    key={content.id}
                    onClick={() => goToChannel(content.event.id)}
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

      {savedVideos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold">My saved videos</h5>

            <X onClick={() => setSavedVideos([])} />
          </div>

          {savedVideos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No saved videos found.
            </p>
          ) : (
            <div className="scrollbar-none custom-scrollbar overflow-x-auto">
              <div className="flex gap-4">
                {savedVideos.map(content => (
                  <div
                    key={content.id}
                    onClick={() => goToChannel(content.channel.event.id)}
                    className="min-w-[270px] flex-shrink-0 bg-black/10"
                  >
                    <ThumbnailPlayer
                      videoUrl={content.channel.url}
                      className="aspect-video w-full rounded-md"
                    />

                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm">{content.channel.title}</h5>
                        <span className="text-muted-foreground flex items-center gap-1 text-sm">
                          {content.channel.event.numOfTips} Tips
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
      <>
        <h5 className="font-semibold">Top contents</h5>

        <div className="relative">
          <div
            // ref={topContentsRef}
            ref={el => registerSection("top", el)}
            className="scrollbar-none custom-scrollbar overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : contents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id)}
                      className="relative flex min-w-[270px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm">
                              {trimTitle(content.title)}
                            </h5>

                            <span className="text-muted-foreground flex items-center gap-1 text-xs whitespace-nowrap">
                              <UsersRound className="size-4" />
                              {content.event.numOfTips} Tips
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
            // ref={latestContentsRef}
            ref={el => registerSection("latest", el)}
            className="scrollbar-none custom-scrollbar overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : latestContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id)}
                      className="relative flex min-w-[270px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm">
                              {trimTitle(content.title)}
                            </h5>

                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <UsersRound className="size-4" />
                              {content.event.numOfTips} Tips
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
            // ref={spotlightContentsRef}
            ref={el => registerSection("spotlight", el)}
            className="scrollbar-none custom-scrollbar overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : latestContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id)}
                      className="relative flex min-w-[270px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
                          className="aspect-video w-full rounded-md"
                        />

                        <div className="p-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm">
                              {trimTitle(content.title)}
                            </h5>

                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <UsersRound className="size-4" />
                              {content.event.numOfTips} Tips
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
            // ref={mostTippedContentsRef}
            ref={el => registerSection("mostTipped", el)}
            className="scrollbar-none custom-scrollbar overflow-x-auto px-4 py-8"
          >
            <div className="flex gap-6">
              {contents.length === 0
                ? Array.from({ length: 3 }).map((_, idx) => (
                    <ContentCardSkeleton key={idx} />
                  ))
                : mostTippedContents.map(content => (
                    <div
                      key={content.id}
                      onClick={() => goToChannel(content.event.id)}
                      className="relative flex min-w-[270px] gap-1 border-2 bg-black/10"
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

      {/* TOP TIPPERS */}
      <>
        <h5 className="mt-8 font-semibold">Top tippers</h5>

        <div className="mt-4 mb-8 flex flex-wrap items-center gap-2">
          {tippers.slice(0, 5).map((tipper, index) => (
            <div
              key={tipper.id}
              className="inline-flex items-center gap-2 rounded-md bg-black/10 px-4 py-2 text-[13px]"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-black text-white">
                {index + 1}
              </span>

              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">
                  {tipper.username}
                </span>
              </div>

              <span className="text-xs font-medium">
                &pound;{tipper.totalTipped}
              </span>
            </div>
          ))}
        </div>
      </>
    </>
  );
};
