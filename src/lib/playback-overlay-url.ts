import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";
import { exploreCommunityJoinHref } from "@/lib/community-links";
import { VIDEO_DEEP_LINK_PARAM } from "@/lib/public-video-url";
import { commitExploreHistory } from "@/lib/explore-url-history";

/** Deep-link overlay play on profile or join tab (not Explore reel handoff keys). */
export const PLAY_EVENT_PARAM = "playEvent";

export type OverlayPlayParams = {
  eventId: string;
  channelId: string;
  url?: string;
  title?: string;
};

export function parseOverlayPlayFromSearchParams(
  searchParams: URLSearchParams
): OverlayPlayParams | null {
  const eventId = searchParams.get(PLAY_EVENT_PARAM)?.trim() ?? "";
  const channelId = searchParams.get(VIDEO_DEEP_LINK_PARAM)?.trim() ?? "";
  if (!eventId || !channelId) return null;
  return { eventId, channelId };
}

export function applyOverlayPlayToSearchParams(
  params: URLSearchParams,
  play: OverlayPlayParams | null
): void {
  if (!play) {
    params.delete(PLAY_EVENT_PARAM);
    params.delete(VIDEO_DEEP_LINK_PARAM);
    return;
  }
  params.set(PLAY_EVENT_PARAM, play.eventId);
  params.set(VIDEO_DEEP_LINK_PARAM, play.channelId);
}

export function buildCreatorProfilePlayHref(
  username: string,
  eventId: string,
  channelId: string
): string {
  const base = buildCreatorProfileSharePath(username);
  const params = new URLSearchParams();
  applyOverlayPlayToSearchParams(params, { eventId, channelId });
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function buildCommunityJoinPlayHref(
  communityId: string,
  eventId: string,
  channelId: string
): string {
  const base = exploreCommunityJoinHref(communityId);
  const params = new URLSearchParams(base.split("?")[1] ?? "");
  applyOverlayPlayToSearchParams(params, { eventId, channelId });
  return `/explore?${params.toString()}`;
}

/** Build href for profile (or any path) with play query applied. No trailing `?` when empty. */
export function buildOverlayPlayHref(
  pathname: string,
  search: string | URLSearchParams,
  play: OverlayPlayParams | null
): string {
  const params = new URLSearchParams(
    typeof search === "string" ? search.replace(/^\?/, "") : search.toString()
  );
  applyOverlayPlayToSearchParams(params, play);
  const q = params.toString();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return q ? `${path}?${q}` : path;
}

/** Explore join tab only — History API via commitExploreHistory (never Next router). */
export function syncOverlayPlayOnExploreJoin(
  play: OverlayPlayParams | null,
  mode: "push" | "replace" = "replace"
): void {
  if (typeof window === "undefined") return;
  const href = buildOverlayPlayHref(
    window.location.pathname,
    window.location.search,
    play
  );
  commitExploreHistory({ href, mode, source: "overlay-play" });
}

/** @deprecated Prefer buildOverlayPlayHref + router.replace on profile, syncOverlayPlayOnExploreJoin on join. */
export function syncOverlayPlayInBrowserUrl(
  play: OverlayPlayParams | null,
  mode: "push" | "replace" = "replace"
): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/explore")) {
    syncOverlayPlayOnExploreJoin(play, mode);
    return;
  }
  const href = buildOverlayPlayHref(
    window.location.pathname,
    window.location.search,
    play
  );
  const state = window.history.state;
  if (mode === "push") {
    window.history.pushState(state, "", href);
  } else {
    window.history.replaceState(state, "", href);
  }
}
