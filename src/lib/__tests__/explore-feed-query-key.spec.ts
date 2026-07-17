import { describe, expect, it } from "vitest";

import {
  buildExploreFeedIdentity,
  buildExploreFeedQueryKey,
} from "../explore-feed-session-cache";

describe("buildExploreFeedQueryKey", () => {
  it("includes feed mode and bucket for trends", () => {
    const key = buildExploreFeedQueryKey({
      feedMode: "trends",
      trendsFilters: { eventTypes: [], language: "", country: "" },
    });
    expect(key).toMatch(/^tipmanna:explore-feed:trends\|b:\d+$/);
  });

  it("includes sorted filter segments for filtered trends", () => {
    const key = buildExploreFeedQueryKey({
      feedMode: "trends",
      trendsFilters: {
        eventTypes: ["music", "comedy"],
        language: "en",
        country: "GB",
      },
    });
    expect(key).toContain("t:comedy,music");
    expect(key).toContain("l:en");
    expect(key).toContain("c:GB");
  });

  it("appends auth segment for saves and community", () => {
    expect(
      buildExploreFeedQueryKey(
        { feedMode: "saves" },
        { hasExploreSession: true }
      )
    ).toContain("sess:auth");
    expect(
      buildExploreFeedQueryKey(
        { feedMode: "community", communityIds: ["c1", "c2"] },
        { hasExploreSession: false }
      )
    ).toContain("sess:anon");
  });

  it("changes key when filter params change", () => {
    const a = buildExploreFeedQueryKey({
      feedMode: "trends",
      trendsFilters: { eventTypes: [], language: "", country: "" },
    });
    const b = buildExploreFeedQueryKey({
      feedMode: "trends",
      trendsFilters: { eventTypes: ["music"], language: "", country: "" },
    });
    expect(a).not.toBe(b);
  });

  it("includes community scope on trends when communityIds are set", () => {
    const key = buildExploreFeedQueryKey({
      feedMode: "trends",
      communityIds: ["c1"],
      trendsFilters: { eventTypes: [], language: "", country: "" },
    });
    expect(key).toContain("comm:c1");
    expect(key).not.toBe(
      buildExploreFeedQueryKey({
        feedMode: "trends",
        trendsFilters: { eventTypes: [], language: "", country: "" },
      })
    );
  });

  it("community mode includes comm segment and sorted ids", () => {
    const key = buildExploreFeedQueryKey(
      {
        feedMode: "community",
        communityIds: ["c2", "c1"],
      },
      { hasExploreSession: true }
    );
    expect(key).toContain("comm:c1,c2");
    expect(key).toContain("sess:auth");
  });
});

describe("buildExploreFeedIdentity", () => {
  it("aligns storageKey with fetchScope for scoped trends", () => {
    const { storageKey, fetchScope } = buildExploreFeedIdentity({
      feedMode: "trends",
      communityIds: ["c1"],
      trendsFilters: {
        eventTypes: ["music"],
        language: "en",
        country: "GB",
      },
    });
    expect(storageKey).toContain("comm:c1");
    expect(storageKey).toContain("t:music");
    expect(fetchScope).toEqual({
      feedMode: "trends",
      communityIds: ["c1"],
      eventVideoTypes: ["music"],
      language: "en",
      country: "GB",
    });
  });

  it("query key equals identity storageKey", () => {
    const params = {
      feedMode: "saves" as const,
      trendsFilters: { eventTypes: [], language: "", country: "" },
    };
    expect(buildExploreFeedQueryKey(params, { hasExploreSession: false })).toBe(
      buildExploreFeedIdentity(params, { hasExploreSession: false }).storageKey
    );
  });
});
