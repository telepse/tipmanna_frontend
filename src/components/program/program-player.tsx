"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";

import VideoPlayer, { VideoPlayerRef } from "@/components/events/video-player";
import type { ProgramBootstrapItem } from "@/lib/program-types";
import { Button } from "@/components/ui/button";

export function ProgramPlayer({
  items,
  backHref,
  title,
}: {
  items: ProgramBootstrapItem[];
  backHref: string;
  title: string;
}) {
  const playable = items.filter(i => i.contentUrl);
  const [index, setIndex] = useState(0);
  const playerRef = useRef<VideoPlayerRef>(null);

  const current = playable[index];

  const goNext = useCallback(() => {
    setIndex(prev => {
      if (prev + 1 >= playable.length) return prev;
      return prev + 1;
    });
  }, [playable.length]);

  const goPrev = useCallback(() => {
    setIndex(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  if (playable.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-sm">
          No playable videos in this program.
        </p>
        <Button
          asChild
          variant="outline"
        >
          <Link href={backHref}>Back to program</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-white/70">
            {index + 1} of {playable.length} · {current?.title}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          <Link href={backHref}>
            <X className="size-4" />
          </Link>
        </Button>
      </header>

      <div className="relative flex flex-1 items-center justify-center">
        {current?.contentUrl ? (
          <VideoPlayer
            key={current.id}
            ref={playerRef}
            videoUrl={current.contentUrl}
            className="h-full max-h-full w-full max-w-full"
            embedMode="chromeless"
            onPlaybackEnded={() => {
              if (index + 1 < playable.length) goNext();
            }}
          />
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10"
          disabled={index <= 0}
          onClick={goPrev}
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10"
          disabled={index + 1 >= playable.length}
          onClick={goNext}
        >
          Next
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </footer>
    </div>
  );
}
