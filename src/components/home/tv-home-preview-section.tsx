"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMediaQuery } from "react-responsive";
import { getCharactersForTipping } from "@/actions/characters";
import { HomeTvLooper } from "@/components/tv/home-tv-looper";
import TVProvider, { useTV } from "@/components/tv-provider";
import type { RoomCharacter } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "../shared/badge";
import { Title } from "../shared/title";
import { Paragraph } from "../shared/paragraph";

function TvPreviewPlayer({
  characters,
  isNarrow,
}: {
  characters: RoomCharacter[];
  isNarrow: boolean;
}) {
  const { scheduleError, scheduleStale, retryScheduleLoad } = useTV();

  return (
    <>
      {scheduleError ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Could not load the live TV schedule.
          {scheduleStale ? " Showing cached schedule." : null}{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => retryScheduleLoad()}
          >
            Retry
          </button>
        </div>
      ) : null}
      <div className="bg-secondary relative overflow-hidden rounded-2xl p-2 md:p-6">
        <div className="relative rounded-2xl bg-white p-4 md:p-6">
          <Link
            href="/tv"
            target="_blank"
            className="text-primary absolute top-1 right-1 inline-block text-xs font-medium underline-offset-4 hover:underline sm:hidden sm:text-sm"
          >
            Open full TV experience
          </Link>

          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between lg:flex-row lg:items-center">
            <div>
              <h2
                id="tv-home-heading"
                className="text-lg font-semibold md:text-2xl"
              >
                Tipmanna TV
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Live scheduled broadcast from videos across the platform.
              </p>
            </div>

            <Link
              href="/tv"
              className="text-primary mt-3 hidden text-xs font-medium underline-offset-4 hover:underline sm:inline-block sm:text-sm"
            >
              Open full TV experience
            </Link>
          </div>

          <div className="h-[380px] pb-4 lg:h-full">
            <HomeTvLooper
              characters={characters}
              playerLayout={isNarrow ? "compact" : "wide"}
              analyticsSurface="homepage_preview"
              showSideRails={false}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Homepage embed: lightweight poster until click, then TV looper.
 */
export default function TvHomePreviewSection() {
  const [characters, setCharacters] = useState<RoomCharacter[] | null>(null);
  const [watchLive, setWatchLive] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const isNarrow = useMediaQuery({ maxWidth: "768px" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getCharactersForTipping();
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) {
        setCharacters(res.data as RoomCharacter[]);
      } else {
        setCharacters([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-initialize the looper when the preview scrolls into view (restores the
  // original no-click autoplay behavior). Lazy mounting is preserved by the
  // parent lazy wrapper; this only flips the player on once visible.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (inView && characters && characters.length > 0) {
      setWatchLive(true);
    }
  }, [inView, characters]);

  return (
    <section
      ref={sectionRef}
      className="wrapper section mt-6 flex flex-col items-center lg:mt-12"
      aria-labelledby="tv-home-heading"
    >
      <Badge title="Audience" />

      <div className="flex flex-col items-center space-y-3">
        <Title
          size="lg"
          align="center"
        >
          Your audience doesn&apos;t just watch <br />{" "}
          <span className="relative bg-gradient-to-r from-[#F57D11] to-[#B55805] bg-clip-text text-transparent">
            they take part
          </span>
        </Title>

        <Paragraph
          align="center"
          className="leading-relaxed"
        >
          Tipmanna turns viewing into live participation. Supporters react{" "}
          <br className="hidden sm:block" /> comment, and engage as content
          happens - not after.
        </Paragraph>
      </div>

      <div className="bg-secondary relative mx-auto w-full overflow-hidden rounded-2xl p-2 md:p-6 lg:w-[1000px]">
        {characters === null && (
          <div className="rounded-2xl bg-white p-4 md:p-6">
            <Link
              href="/tv"
              target="_blank"
              className="text-primary absolute top-1 right-1 inline-block text-xs font-medium underline-offset-4 hover:underline sm:hidden sm:text-sm"
            >
              Open full TV experience
            </Link>

            <div className="mx-auto flex max-w-6xl flex-col items-start justify-between lg:flex-row lg:items-center">
              <div>
                <h2
                  id="tv-home-heading"
                  className="text-lg font-semibold md:text-2xl"
                >
                  Tipmanna TV
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Live scheduled broadcast from videos across the platform.
                </p>
              </div>

              <Link
                href="/tv"
                className="text-primary mt-3 hidden text-xs font-medium underline-offset-4 hover:underline sm:inline-block sm:text-sm"
              >
                Open full TV experience
              </Link>
            </div>
          </div>
        )}

        {characters === null ? (
          <div
            className="bg-muted/50 flex min-h-[400px] w-full flex-col items-center justify-center gap-2 rounded-lg md:min-h-[400px] lg:w-[1200px]"
            aria-busy="true"
            aria-label="Loading live TV preview"
          >
            <span className="text-muted-foreground animate-pulse text-sm">
              Loading live TV…
            </span>
          </div>
        ) : !watchLive ? (
          <div className="relative overflow-hidden rounded-xl border bg-black/90">
            <Image
              src="/patterns/bg_pattern.webp"
              alt=""
              width={1200}
              height={675}
              className="h-[200px] w-full object-cover opacity-70 md:h-[280px]"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 p-4">
              <p className="text-center text-sm text-white/90">
                Watch Tipmanna&apos;s live scheduled broadcast
              </p>
              <Button
                type="button"
                className="bg-white text-black hover:bg-white/90"
                onClick={() => setWatchLive(true)}
              >
                Watch live
              </Button>
            </div>
          </div>
        ) : (
          <TVProvider>
            <TvPreviewPlayer
              characters={characters}
              isNarrow={isNarrow}
            />
          </TVProvider>
        )}
      </div>
    </section>
  );
}
