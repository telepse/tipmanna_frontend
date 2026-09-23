"use client";

import { cn } from "@/lib/utils";

const swallowClick = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/** Masks YouTube title-card chrome at the top of chromeless embeds.
 * Full removal of YouTube metadata is not possible via playerVars alone; this gradient is best-effort. */
export function YoutubeChromeMask({
  className,
  blockClicks = false,
}: {
  className?: string;
  /** When true, swallow clicks on title/logo chrome (featured overlay). */
  blockClicks?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-[55] h-[18%] max-h-[120px] min-h-[48px]",
        "bg-gradient-to-b from-black/85 via-black/35 to-transparent",
        "pointer-events-none",
        className
      )}
      aria-hidden
    >
      {blockClicks ? (
        <>
          <div
            className="pointer-events-auto absolute top-0 left-0 h-[55%] w-[72%] max-w-[280px]"
            aria-hidden
            onClick={swallowClick}
            onPointerDown={swallowClick}
          />
          <div
            className="pointer-events-auto absolute top-0 right-0 h-[45%] w-[28%] max-w-[96px]"
            aria-hidden
            onClick={swallowClick}
            onPointerDown={swallowClick}
          />
        </>
      ) : null}
    </div>
  );
}
