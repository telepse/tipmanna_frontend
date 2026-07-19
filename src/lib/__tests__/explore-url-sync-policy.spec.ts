import { describe, expect, it } from "vitest";

import {
  expandDiscoverTabIntent,
  openPanelFromExpandedIntent,
  searchIntent,
} from "../discover-navigation-state";
import {
  exploreCurrentHref,
  exploreStateAheadOfUrl,
} from "../explore-url-sync-policy";
import { buildExploreFeedHref } from "../explore-url-feed-state";

describe("explore-url-sync-policy", () => {
  it("detects when React state is ahead of the browser URL", () => {
    const feedState = {
      trendEventTypes: [] as string[],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "saves" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
    };
    expect(
      exploreStateAheadOfUrl(
        "/explore",
        { tab: "feed" },
        feedState,
        "feedTab=trends"
      )
    ).toBe(true);
    expect(
      exploreStateAheadOfUrl(
        "/explore",
        { tab: "feed" },
        feedState,
        "feedTab=saves"
      )
    ).toBe(false);
  });

  it("detects main-tab state ahead of URL", () => {
    const feedState = {
      trendEventTypes: [] as string[],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
    };
    expect(
      exploreStateAheadOfUrl(
        "/explore",
        { tab: "my-communities" },
        feedState,
        ""
      )
    ).toBe(true);
    expect(
      exploreStateAheadOfUrl(
        "/explore",
        { tab: "my-communities" },
        feedState,
        "tab=my-communities&feedTab=trends"
      )
    ).toBe(false);
  });

  it("buildExploreFeedHref preserves feedTab on my-communities and join", () => {
    const feedState = {
      trendEventTypes: [] as string[],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "tv" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
    };
    const hub = buildExploreFeedHref(
      "/explore",
      { tab: "my-communities" },
      feedState,
      ""
    );
    expect(hub).toContain("tab=my-communities");
    expect(hub).toContain("feedTab=tv");

    const join = buildExploreFeedHref(
      "/explore",
      { tab: "join", joinCommunityId: "11111111-1111-4111-8111-111111111111" },
      feedState,
      ""
    );
    expect(join).toContain("tab=join");
    expect(join).toContain(
      "joinCommunity=11111111-1111-4111-8111-111111111111"
    );
    expect(join).toContain("feedTab=tv");
  });

  it("buildExploreFeedHref adds feedTab when URL has no feed params", () => {
    const href = buildExploreFeedHref(
      "/explore",
      { tab: "feed" },
      {
        trendEventTypes: [],
        trendLanguage: "",
        trendCountry: "",
        feedSubTab: "saves",
        tvExploreSource: "tipmanna",
        communityFeedSelIds: [],
      },
      ""
    );
    expect(href).toBe("/explore?feedTab=saves");
  });

  it("exploreCurrentHref formats path and query", () => {
    expect(exploreCurrentHref("/explore", "feedTab=saves")).toBe(
      "/explore?feedTab=saves"
    );
    expect(exploreCurrentHref("/explore", "")).toBe("/explore");
  });

  it("detects filter state ahead of URL", () => {
    const feedState = {
      trendEventTypes: ["COMEDY"],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "trends" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
    };
    expect(
      exploreStateAheadOfUrl("/explore", { tab: "feed" }, feedState, "")
    ).toBe(true);
    expect(
      exploreStateAheadOfUrl(
        "/explore",
        { tab: "feed" },
        feedState,
        "feedTypes=COMEDY&feedTab=trends"
      )
    ).toBe(false);
  });

  it("buildExploreFeedHref clears tab when returning to feed", () => {
    const feedState = {
      trendEventTypes: [] as string[],
      trendLanguage: "",
      trendCountry: "",
      feedSubTab: "saves" as const,
      tvExploreSource: "tipmanna",
      communityFeedSelIds: [] as string[],
    };
    const href = buildExploreFeedHref(
      "/explore",
      { tab: "feed" },
      feedState,
      "tab=my-communities&feedTab=saves"
    );
    expect(href).toBe("/explore?feedTab=saves");
    expect(href).not.toContain("tab=my-communities");
  });

  it("buildExploreFeedHref adds feedTypes for filter commits", () => {
    const href = buildExploreFeedHref(
      "/explore",
      { tab: "feed" },
      {
        trendEventTypes: ["COMEDY"],
        trendLanguage: "",
        trendCountry: "",
        feedSubTab: "trends",
        tvExploreSource: "tipmanna",
        communityFeedSelIds: [],
      },
      ""
    );
    expect(href).toBe("/explore?feedTypes=COMEDY&feedTab=trends");
  });
});

describe("discover-navigation-state expand", () => {
  it("expandDiscoverTabIntent opens discover tab and closes panel", () => {
    expect(expandDiscoverTabIntent()).toEqual({
      tab: "discover",
      closePanel: true,
    });
  });

  it("searchIntent with unified nav keeps feed tab", () => {
    expect(searchIntent("music", true)).toEqual({
      searchTerm: "music",
      openPanel: true,
    });
  });

  it("openPanelFromExpandedIntent reveals feed under unified nav", () => {
    expect(openPanelFromExpandedIntent(true)).toEqual({
      tab: "feed",
      openPanel: true,
    });
  });
});
