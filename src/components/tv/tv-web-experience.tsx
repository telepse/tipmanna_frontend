"use client";

import { useMediaQuery } from "react-responsive";
import {
  TvInteractiveShell,
  type TvInteractiveShellProps,
} from "./tv-interactive-shell";
import { cn } from "@/lib/utils";
import { useClientViewportWidth } from "@/hooks/use-client-viewport-width";

export type TvWebExperienceProps = Omit<TvInteractiveShellProps, "variant">;

/**
 * Desktop /tv layout: full-width channel-style shell (see plan). Wraps the same
 * interactive TV features as mobile with wider responsive layout.
 */
export function TvWebExperience(props: TvWebExperienceProps) {
  const viewportWidth = useClientViewportWidth();
  const isMobileLandscape =
    useMediaQuery({ query: "(orientation: landscape)" }) &&
    viewportWidth > 0 &&
    viewportWidth <= 768;

  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-28",
        isMobileLandscape ? "h-full w-full bg-black p-0" : ""
      )}
    >
      <TvInteractiveShell
        {...props}
        variant="desktop"
      />
    </div>
  );
}
