/* eslint-disable @typescript-eslint/no-explicit-any */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Third-party imports
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Bookmark, ChevronRight, Sparkles, UsersRound, X } from "lucide-react";

// Local imports
import { ThumbnailPlayer } from "./thumbnail-player";

interface Content {
  event: any;
  id: string;
  title: string;
  url: string;
}

interface Props {
  isExploreDrawerOpen: boolean;
  setIsExploreDrawerOpen: (value: boolean) => void;
  setIsProfileDrawerOpen: (value: boolean) => void;
  contents: any[];
  tippers: any[];
  latestContents: any[];
  mostTippedContents: any[];
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

export const ExploreDrawer = ({
  isExploreDrawerOpen,
  setIsExploreDrawerOpen,
  contents,
  tippers,
  latestContents,
  mostTippedContents,
  setIsProfileDrawerOpen,
}: Props) => {
  const form = useForm<{
    searchTerm: string;
  }>({
    defaultValues: { searchTerm: "" },
  });

  const searchTerm = form.watch("searchTerm");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const router = useRouter();

  const goToChannel = (eventId: string, frameId: string) => {
    router.push(`/room/${eventId}?frame=${frameId}`);
  };

  const filteredContents = contents.filter(content =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tagFilteredContents = selectedTag
    ? contents.filter(
        content =>
          content.event.eventType?.toLowerCase() === selectedTag.toLowerCase()
      )
    : [];

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
    <Drawer
      open={isExploreDrawerOpen}
      onOpenChange={setIsExploreDrawerOpen}
    >
      <DrawerContent className="z-[999999999] h-[70vh] space-y-2 overflow-y-auto rounded-t-full p-4">
        <button
          type="button"
          onClick={() => setIsExploreDrawerOpen(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-black hover:bg-gray-200"
        >
          <X size={24} />
        </button>

        <DrawerHeader>
          <DrawerTitle className="text-2xl">Discover contents</DrawerTitle>
        </DrawerHeader>

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

                  <button
                    type="button"
                    onClick={() => {
                      setIsExploreDrawerOpen(false);
                      setIsProfileDrawerOpen(true);
                    }}
                  >
                    <Bookmark />
                  </button>
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
                  form.setValue("searchTerm", ""); // optional: reset search
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

        <div className="h-[calc(100vh-80px)] space-y-4 overflow-y-auto">
          {searchTerm && (
            <div className="space-y-4">
              <h5 className="font-semibold">
                Search results for &apos;{searchTerm}&apos;
              </h5>

              {filteredContents.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No results found.
                </p>
              ) : (
                <div className="scrollbar-none overflow-x-auto">
                  <div className="flex gap-4">
                    {filteredContents.map(content => (
                      <div
                        key={content.id}
                        onClick={() =>
                          goToChannel(content.event.id, content.id)
                        }
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
                <p className="text-muted-foreground text-sm">
                  No results found.
                </p>
              ) : (
                <div className="scrollbar-none overflow-x-auto">
                  <div className="flex gap-4">
                    {tagFilteredContents.map(content => (
                      <div
                        key={content.id}
                        onClick={() =>
                          goToChannel(content.event.id, content.id)
                        }
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
                      onClick={() => goToChannel(content.event.id, content.id)}
                      className="relative flex min-w-[270px] gap-1 border-2 bg-black/10"
                    >
                      <div className="space-y-1">
                        <ThumbnailPlayer
                          videoUrl={content.url}
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

              {/* Right scroll button */}
              <button
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

              {/* Right scroll button */}
              <button
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
                      className="min-w-[200px] flex-shrink-0 bg-black/10"
                    >
                      <ThumbnailPlayer
                        videoUrl={content.url}
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

              {/* Right scroll button */}
              <button
                onClick={() => scrollNext(mostTippedContentsRef)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black p-2 text-white hover:bg-black/70"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="font-semibold">Top tippers</h5>

            <div className="overflow-hidden">
              <div className="marquee">
                {[...tippers, ...tippers].map((tipper, index) => (
                  <div
                    key={index}
                    className="inline-flex items-baseline gap-2 rounded-md bg-black/10 px-4 py-2"
                  >
                    <span className="text-muted-foreground">
                      {tipper.fullName}
                    </span>{" "}
                    <span className="text-sm">
                      &pound; {tipper.totalTipped}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
