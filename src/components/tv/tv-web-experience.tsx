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
    <div className="mx-auto mt-14 w-full max-w-[1920px] px-4 pb-28 sm:px-6 lg:mt-16 lg:px-8 xl:px-12 2xl:px-14">
      <TvInteractiveShell
        {...props}
        variant="desktop"
      />
    </div>
  );
}
