import {
  applyOverlayPlayToSearchParams,
  PLAY_EVENT_PARAM,
} from "@/lib/playback-overlay-url";
import { VIDEO_DEEP_LINK_PARAM } from "@/lib/public-video-url";

export type ExploreFeedSubTab = "trends" | "saves" | "tv" | "community";

export type ExploreFeedUrlState = {
  trendEventTypes: string[];
  trendLanguage: string;
  trendCountry: string;
  feedSubTab: ExploreFeedSubTab;
  tvExploreSource: "tipmanna" | string;
  communityFeedSelIds: string[];
  /** When true, ended livestreams may appear in Explore reel pools. Default false. */
  includeEndedLive: boolean;
};

export type ExploreFeedUrlTabContext = {
  tab: "feed" | "discover" | "community" | "my-communities" | "join";
  joinCommunityId?: string;
};

export function parseExploreFeedTab(
  v: string | null
): ExploreFeedSubTab | null {
  if (v === "trends" || v === "saves" || v === "tv" || v === "community") {
    return v;
  }
  return null;
}

export function parseExploreFeedUrlState(
  sp: URLSearchParams
): ExploreFeedUrlState {
  const ft = sp.get("feedTypes");
  const trendEventTypes = ft?.trim()
    ? ft
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  const fl = sp.get("feedLang");
  const trendLanguage = fl?.trim() ?? "";

  const fc = sp.get("feedCountry");
  const trendCountry = fc?.trim() ?? "";

  const ftab = parseExploreFeedTab(sp.get("feedTab"));
  let feedSubTab: ExploreFeedSubTab = ftab ?? "trends";
  // Wave 3 community_feed canonical route: `/explore?tab=community`
  if (sp.get("tab") === "community" && ftab == null) {
    feedSubTab = "community";
  }

  const tvs = sp.get("tvSource")?.trim();
  const tvExploreSource = tvs || "tipmanna";

  const comm = sp.get("communities");
  const communityFeedSelIds = comm?.trim()
    ? comm
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
    : [];

  const includeEndedLive = sp.get("endedLive") === "1";

  return {
    trendEventTypes,
    trendLanguage,
    trendCountry,
    feedSubTab,
    tvExploreSource,
    communityFeedSelIds,
    includeEndedLive,
  };
}

function sortedStringArrayEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function exploreFeedUrlStatesEqual(
  a: ExploreFeedUrlState,
  b: ExploreFeedUrlState
): boolean {
  return (
    sortedStringArrayEqual(a.trendEventTypes, b.trendEventTypes) &&
    a.trendLanguage === b.trendLanguage &&
    a.trendCountry === b.trendCountry &&
    a.feedSubTab === b.feedSubTab &&
    a.tvExploreSource === b.tvExploreSource &&
    sortedStringArrayEqual(a.communityFeedSelIds, b.communityFeedSelIds) &&
    a.includeEndedLive === b.includeEndedLive
  );
}

/** Serialize feed shell fields into URLSearchParams (does not touch tab/join params). */
export function applyExploreFeedUrlState(
  p: URLSearchParams,
  state: ExploreFeedUrlState
): void {
  if (state.trendEventTypes.length) {
    p.set("feedTypes", state.trendEventTypes.join(","));
  } else {
    p.delete("feedTypes");
  }

  if (state.trendLanguage.trim()) {
    p.set("feedLang", state.trendLanguage.trim());
  } else {
    p.delete("feedLang");
  }

  if (state.trendCountry.trim()) {
    p.set("feedCountry", state.trendCountry.trim());
  } else {
    p.delete("feedCountry");
  }

  p.set("feedTab", state.feedSubTab);

  if (
    state.feedSubTab === "community" &&
    state.communityFeedSelIds.length > 0
  ) {
    p.set("communities", state.communityFeedSelIds.join(","));
  } else {
    p.delete("communities");
  }

  if (state.feedSubTab === "tv") {
    if (state.tvExploreSource !== "tipmanna") {
      p.set("tvSource", state.tvExploreSource);
    } else {
      p.delete("tvSource");
    }
  } else {
    p.delete("tvSource");
  }

  if (state.includeEndedLive) {
    p.set("endedLive", "1");
  } else {
    p.delete("endedLive");
  }
}

export function buildExploreFeedHref(
  pathBase: string,
  tabCtx: ExploreFeedUrlTabContext,
  feedState: ExploreFeedUrlState,
  existingSearchParamsKey: string
): string {
  const p = new URLSearchParams(existingSearchParamsKey);
  applyExploreFeedUrlState(p, feedState);

  if (tabCtx.tab === "join" && tabCtx.joinCommunityId) {
    p.set("tab", "join");
    p.set("joinCommunity", tabCtx.joinCommunityId);
  } else if (tabCtx.tab === "join" && !tabCtx.joinCommunityId) {
    p.set("tab", "my-communities");
    p.delete("joinCommunity");
  } else if (tabCtx.tab === "my-communities") {
    p.set("tab", "my-communities");
    p.delete("joinCommunity");
  } else if (tabCtx.tab === "discover") {
    p.set("tab", "discover");
    p.delete("joinCommunity");
  } else if (tabCtx.tab === "community") {
    p.set("tab", "community");
    p.delete("joinCommunity");
  } else {
    p.delete("tab");
    p.delete("joinCommunity");
    applyOverlayPlayToSearchParams(p, null);
  }

  if (tabCtx.tab !== "join" || !tabCtx.joinCommunityId) {
    p.delete(PLAY_EVENT_PARAM);
    p.delete(VIDEO_DEEP_LINK_PARAM);
  }

  const q = p.toString();
  return q ? `${pathBase}?${q}` : pathBase;
}
