"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMediaQuery } from "react-responsive";
import { getCharactersForTipping } from "@/actions/characters";
import { TvLooper } from "@/components/tv/tv-looper";
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
      <div className="bg-secondary/10 relative overflow-hidden rounded-2xl p-2 md:p-6">
        <TvLooper
          characters={characters}
          playerLayout={isNarrow ? "compact" : "wide"}
          analyticsSurface="homepage_preview"
          showSideRails={false}
        />
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

  if (characters && characters.length === 0) {
    return (
      <section
        className="border-border/60 bg-background w-full border-t py-10 md:py-14"
        aria-labelledby="tv-home-heading"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2
            id="tv-home-heading"
            className="text-xl font-semibold md:text-2xl"
          >
            Tipmanna TV
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Live TV is between shows. Open the full experience to browse the
            schedule.
          </p>
          <Link
            href="/tv"
            className="text-primary mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            Open full TV experience
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="wrapper section mt-6 flex flex-col items-center lg:mt-12"
      aria-labelledby="tv-home-heading"
    >
      <Badge title="Audience" />

      <div className="flex flex-col items-center space-y-2">
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

      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div className="space-y-1">
            <h2
              id="tv-home-heading"
              className="text-xl font-semibold tracking-tight md:text-2xl"
            >
              Tipmanna TV
            </h2>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              Live scheduled broadcast from events across the platform.
            </p>
          </div>
          <Link
            href="/tv"
            className="text-primary shrink-0 text-sm font-medium underline-offset-4 hover:underline"
          >
            Open full TV experience
          </Link>
        </div>

        {characters === null ? (
          <div
            className="bg-muted/50 flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-lg md:min-h-[280px]"
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
