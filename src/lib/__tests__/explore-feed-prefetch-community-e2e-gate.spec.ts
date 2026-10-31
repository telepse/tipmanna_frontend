import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Explore feed prefetch community E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../explore-feed-prefetch-cache.ts"),
    "utf8"
  );

  it("gates community batch prefetch and idle scheduler under ActiveOnClient", () => {
    expect(src).toMatch(
      /async function fetchCommunitySnapshot[\s\S]*isExploreE2eFixturesActiveOnClient\(\)[\s\S]*E2E_FEED_BOOT/
    );
    expect(src).toMatch(
      /export function prefetchExploreCommunityFeed[\s\S]*isExploreE2eFixturesActiveOnClient\(\)/
    );
    expect(src).toMatch(
      /export function scheduleExploreFeedPrefetchIdle[\s\S]*isExploreE2eFixturesActiveOnClient\(\)/
    );
    expect(src).toMatch(
      /export function prefetchExploreSavesFeed[\s\S]*isExploreE2eFixturesActiveOnClient\(\)/
    );
  });
});
