"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import {
  clearPlaybackReturn,
  peekPlaybackReturn,
  PLAYBACK_RETURN_CHANGED_EVENT,
  type PlaybackReturnContext,
} from "@/lib/playback-return-stack";
import { stashDiscoverUiRestore } from "@/lib/discover-return.util";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onNavigateBack?: () => void;
  /** When set, the chip only renders if this returns true for the current context. */
  isVisible?: (context: PlaybackReturnContext) => boolean;
};

export function PlaybackReturnBackChip({
  className,
  onNavigateBack,
  isVisible,
}: Props) {
  const router = useRouter();
  const [context, setContext] = useState<PlaybackReturnContext | null>(null);

  useEffect(() => {
    const sync = () => setContext(peekPlaybackReturn());
    sync();
    window.addEventListener(PLAYBACK_RETURN_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener(PLAYBACK_RETURN_CHANGED_EVENT, sync);
    };
  }, []);

  const dismiss = useCallback(() => {
    clearPlaybackReturn();
    setContext(null);
  }, []);

  const navigateBack = useCallback(() => {
    const ctx = peekPlaybackReturn();
    if (!ctx?.returnTo) return;
    if (ctx.discoverUi) {
      stashDiscoverUiRestore({
        ...ctx.discoverUi,
        createdAt: Date.now(),
      });
    }
    clearPlaybackReturn();
    setContext(null);
    onNavigateBack?.();
    router.push(ctx.returnTo, { scroll: false });
  }, [onNavigateBack, router]);

  if (!context?.returnTo) return null;
  if (isVisible && !isVisible(context)) return null;

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
      if (ctx.discoverUi) {
        stashDiscoverUiRestore({
          ...ctx.discoverUi,
          createdAt: Date.now(),
        });
      }
      clearPlaybackReturn();
      router.push(ctx.returnTo, { scroll: false });
      return;
    }
    fallback();
  }, [fallback, router]);
}
