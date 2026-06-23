"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import { getCharactersForTipping } from "@/actions/characters";
import { TvLooper } from "@/components/tv/tv-looper";
import TVProvider from "@/components/tv-provider";
import type { RoomCharacter } from "@/types";

/**
 * Homepage embed: TV looper + payment animations only (no tip drawer / Stripe).
 * Parent lazy wrapper gates mount via IntersectionObserver (rootMargin 200px).
 * Local TVProvider scopes schedule/sync to this preview only.
 */
export default function TvHomePreviewSection() {
  const [characters, setCharacters] = useState<RoomCharacter[] | null>(null);
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

  if (characters && characters.length === 0) {
    return (
      <section
        className="border-border/60 bg-background w-full border-t py-10 md:py-14"
        aria-labelledby="tv-home-heading"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 id="tv-home-heading" className="text-xl font-semibold md:text-2xl">
            Tipmanna TV
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Live TV is between shows. Open the full experience to browse the schedule.
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
    <TVProvider>
      <section
        className="border-border/60 bg-background w-full border-t py-10 md:py-14"
        aria-labelledby="tv-home-heading"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
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
          ) : (
            <div className="relative overflow-hidden rounded-xl border bg-black/5 p-2 md:p-4">
              <TvLooper
                characters={characters}
                playerLayout={isNarrow ? "compact" : "wide"}
                analyticsSurface="homepage_preview"
                showSideRails={false}
              />
            </div>
          )}
        </div>
      </section>
    </TVProvider>
  );
}
