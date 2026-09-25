import { describe, expect, it } from "vitest";

import {
  buildExploreFeedHref,
  exploreFeedUrlStatesEqual,
  parseExploreFeedUrlState,
} from "../explore-url-feed-state";

describe("explore-url-feed-state", () => {
  it("parses feed params from URL", () => {
    const sp = new URLSearchParams(
      "feedTypes=music,comedy&feedLang=en&feedCountry=GB&feedTab=saves&tvSource=abc&communities=c1,c2"
    );
    const state = parseExploreFeedUrlState(sp);
    expect(state.trendEventTypes).toEqual(["music", "comedy"]);
    expect(state.trendLanguage).toBe("en");
    expect(state.trendCountry).toBe("GB");
    expect(state.feedSubTab).toBe("saves");
    expect(state.tvExploreSource).toBe("abc");
    expect(state.communityFeedSelIds).toEqual(["c1", "c2"]);
    expect(state.includeEndedLive).toBe(false);
  });

  it("parses endedLive opt-in", () => {
    const state = parseExploreFeedUrlState(new URLSearchParams("endedLive=1"));
    expect(state.includeEndedLive).toBe(true);
  });

  it("returns defaults when params are absent", () => {
    const state = parseExploreFeedUrlState(new URLSearchParams());
    expect(state.trendEventTypes).toEqual([]);
    expect(state.trendLanguage).toBe("");
    expect(state.trendCountry).toBe("");
    expect(state.feedSubTab).toBe("trends");
    expect(state.tvExploreSource).toBe("tipmanna");
    expect(state.communityFeedSelIds).toEqual([]);
    expect(state.includeEndedLive).toBe(false);
  });

  it("round-trips through buildExploreFeedHref", () => {
    const state = {
      trendEventTypes: ["music"],
      trendLanguage: "en",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
      includeEndedLive: true,
    };
    const href = buildExploreFeedHref(
      "/explore",
      { tab: "feed" },
      state,
      "tab=discover"
    );
    const q = href.split("?")[1] ?? "";
    const parsed = parseExploreFeedUrlState(new URLSearchParams(q));
    expect(exploreFeedUrlStatesEqual(state, parsed)).toBe(true);
    expect(new URLSearchParams(q).get("tab")).toBeNull();
  });

  it("exploreFeedUrlStatesEqual ignores array order", () => {
    const a = {
      trendEventTypes: ["b", "a"],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: ["c2", "c1"],
      includeEndedLive: false,
    };
    const b = {
      trendEventTypes: ["a", "b"],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: ["c1", "c2"],
      includeEndedLive: false,
    };
    expect(exploreFeedUrlStatesEqual(a, b)).toBe(true);
  });

  it("keeps playEvent and v on join tab without channel/eventId reel keys", () => {
    const existing =
      "tab=join&joinCommunity=c1&playEvent=evt-1&v=ch-1&creatorDrawer=alice";
    const href = buildExploreFeedHref(
      "/explore",
      { tab: "join", joinCommunityId: "c1" },
      parseExploreFeedUrlState(new URLSearchParams(existing)),
      existing
    );
    const q = new URLSearchParams(href.split("?")[1] ?? "");
    expect(q.get("playEvent")).toBe("evt-1");
    expect(q.get("v")).toBe("ch-1");
    expect(q.get("channel")).toBeNull();
    expect(q.get("eventId")).toBeNull();
    expect(q.get("creatorDrawer")).toBe("alice");
  });

  it("drops play keys when leaving join tab", () => {
    const existing =
      "tab=join&joinCommunity=c1&playEvent=evt-1&v=ch-1&communityDrawer=comm-1";
    const href = buildExploreFeedHref(
      "/explore",
      { tab: "feed" },
      parseExploreFeedUrlState(new URLSearchParams(existing)),
      existing
    );
    const q = new URLSearchParams(href.split("?")[1] ?? "");
    expect(q.get("playEvent")).toBeNull();
    expect(q.get("v")).toBeNull();
    expect(q.get("communityDrawer")).toBe("comm-1");
  });
});
