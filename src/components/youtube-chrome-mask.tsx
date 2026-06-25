"use client";

import { cn } from "@/lib/utils";

/** Masks YouTube title-card chrome at the top of chromeless embeds.
 * Full removal of YouTube metadata is not possible via playerVars alone; this gradient is best-effort. */
export function YoutubeChromeMask({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-[55] h-[18%] max-h-[120px] min-h-[48px]",
        "bg-gradient-to-b from-black/85 via-black/35 to-transparent",
        className
      )}
      aria-hidden
    />
  );
}
