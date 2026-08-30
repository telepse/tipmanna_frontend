"use client";

import type { PlaybackReturnContext } from "@/lib/playback-return-stack";

/** Apply scroll restoration after returning from content client. */
export function restoreProfileUiScroll(
  context: PlaybackReturnContext | null
): void {
  if (!context?.profileUi?.scrollY || typeof window === "undefined") return;
  requestAnimationFrame(() => {
    window.scrollTo({ top: context.profileUi!.scrollY, behavior: "auto" });
  });
}

export function parseCreatorDrawerFromUrl(
  searchParams: URLSearchParams
): string | null {
  const raw = searchParams.get("creatorDrawer")?.trim();
  return raw ? raw.replace(/^@/, "") : null;
}

export function parseCommunityDrawerFromUrl(
  searchParams: URLSearchParams
): string | null {
  return searchParams.get("communityDrawer")?.trim() || null;
}
