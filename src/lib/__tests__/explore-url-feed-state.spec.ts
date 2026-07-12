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
  });

  it("returns defaults when params are absent", () => {
    const state = parseExploreFeedUrlState(new URLSearchParams());
    expect(state.trendEventTypes).toEqual([]);
    expect(state.trendLanguage).toBe("");
    expect(state.trendCountry).toBe("");
    expect(state.feedSubTab).toBe("trends");
    expect(state.tvExploreSource).toBe("tipmanna");
    expect(state.communityFeedSelIds).toEqual([]);
  });

  it("round-trips through buildExploreFeedHref", () => {
    const state = {
      trendEventTypes: ["music"],
      trendLanguage: "en",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
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
    };
    const b = {
      trendEventTypes: ["a", "b"],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: ["c1", "c2"],
    };
    expect(exploreFeedUrlStatesEqual(a, b)).toBe(true);
  });
});
