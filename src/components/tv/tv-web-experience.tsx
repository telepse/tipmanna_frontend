"use client";

import {
  TvInteractiveShell,
  type TvInteractiveShellProps,
} from "./tv-interactive-shell";

export type TvWebExperienceProps = Omit<TvInteractiveShellProps, "variant">;

/**
 * Desktop /tv layout: full-width channel-style shell (see plan). Wraps the same
 * interactive TV features as mobile with wider responsive layout.
 */
export function TvWebExperience(props: TvWebExperienceProps) {
  return (
    <div className="mx-auto w-full px-4 pb-28">
      <TvInteractiveShell
        {...props}
        variant="desktop"
      />
    </div>
  );
}
