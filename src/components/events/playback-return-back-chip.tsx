"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import {
  clearPlaybackReturn,
  peekPlaybackReturn,
  type PlaybackReturnContext,
} from "@/lib/playback-return-stack";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onNavigateBack?: () => void;
};

export function PlaybackReturnBackChip({ className, onNavigateBack }: Props) {
  const router = useRouter();
  const [context, setContext] = useState<PlaybackReturnContext | null>(null);

  useEffect(() => {
    setContext(peekPlaybackReturn());
  }, []);

  const dismiss = useCallback(() => {
    clearPlaybackReturn();
    setContext(null);
  }, []);

  const navigateBack = useCallback(() => {
    const ctx = peekPlaybackReturn();
    if (!ctx?.returnTo) return;
    clearPlaybackReturn();
    setContext(null);
    onNavigateBack?.();
    router.push(ctx.returnTo);
  }, [onNavigateBack, router]);

  if (!context?.returnTo) return null;

  const label = context.label?.trim() || "Back";

  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex max-w-[min(100%,16rem)] items-center gap-1 rounded-full bg-black/70 py-1 pr-1 pl-2 text-xs text-white shadow-md backdrop-blur-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={navigateBack}
        className="inline-flex min-w-0 flex-1 items-center gap-1 truncate font-medium"
        aria-label={label}
      >
        <ChevronLeft className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-full p-0.5 hover:bg-white/15"
        aria-label="Dismiss return hint"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

/** Landscape close handler: return to saved context when playback return stack exists. */
export function usePlaybackReturnLandscapeClose(
  router: ReturnType<typeof useRouter>,
  fallback: () => void
) {
  return useCallback(() => {
    const ctx = peekPlaybackReturn();
    if (ctx?.returnTo) {
      clearPlaybackReturn();
      router.push(ctx.returnTo);
      return;
    }
    fallback();
  }, [fallback, router]);
}
