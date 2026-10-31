import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level regression: E2E dual-gate must short-circuit membership /
 * host community Server Action fan-out (avoids Next-Action POSTs under ?e2e=1).
 */
describe("Explore E2E bootstrap Server Action gates", () => {
  const pageClient = fs.readFileSync(
    path.join(__dirname, "../explore-page-client.tsx"),
    "utf8"
  );
  const chrome = fs.readFileSync(
    path.join(__dirname, "../explore-global-chrome.tsx"),
    "utf8"
  );
  const feed = fs.readFileSync(
    path.join(__dirname, "../explore-feed-client.tsx"),
    "utf8"
  );
  const schedule = fs.readFileSync(
    path.join(__dirname, "../explore-tv-schedule-feed.tsx"),
    "utf8"
  );

  it("explore-page-client skips host/joined SA calls when e2eFixtures", () => {
    expect(pageClient).toMatch(/if \(e2eFixtures\) \{/);
    expect(pageClient).toMatch(/setHostTvCommunities\(\{ owned: \[\], coCreator: \[\] \}\)/);
    // Under e2eFixtures branch, getMyCommunitiesAction must not run first.
    const e2eBlock = pageClient.slice(
      pageClient.indexOf("if (e2eFixtures) {"),
      pageClient.indexOf("const hostPromise = getMyCommunitiesAction")
    );
    expect(e2eBlock).toMatch(/return;/);
  });

  it("explore-global-chrome gates joined communities SA", () => {
    expect(chrome).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(chrome).toMatch(/getMeJoinedCommunitiesAction/);
  });

  it("feed metrics and TV schedule skip SA under E2E helper", () => {
    expect(feed).toMatch(
      /isExploreE2eFixturesActiveOnClient\(\)[\s\S]*getExploreChannelMetricsAction/
    );
    expect(schedule).toMatch(
      /isExploreE2eFixturesActiveOnClient\(\)[\s\S]*fetchTvScheduleAction/
    );
  });

  it("explore-page-client skips idle feed/TV prefetch schedulers when e2eFixtures", () => {
    expect(pageClient).toMatch(
      /if \(tab !== "feed" \|\| e2eFixtures\) return;\s*\n\s*scheduleExploreFeedPrefetchIdle/
    );
    expect(pageClient).toMatch(
      /if \(tab === "feed" && !e2eFixtures\) prefetchExploreFeedInitial/
    );
  });

  it("community feed allows E2E fixture boot without tipper session or community picker", () => {
    expect(feed).toMatch(
      /feedMode === "community"[\s\S]*!hasExploreSession[\s\S]*!isExploreE2eFixturesActiveOnClient\(\)/
    );
    expect(feed).toMatch(
      /feedMode === "community"[\s\S]*!\(communityIds\?\.length[\s\S]*!isExploreE2eFixturesActiveOnClient\(\)/
    );
  });

  it("explore-page-client skips character-catalog SAs when e2eFixtures", () => {
    expect(pageClient).toMatch(/if \(e2eFixtures\) return;/);
    const charBlock = pageClient.slice(
      pageClient.indexOf(
        "// Dual-gate: skip character-catalog Server Actions under Explore E2E"
      ),
      pageClient.indexOf("getCharactersForTipping()")
    );
    expect(charBlock).toMatch(/if \(e2eFixtures\) return;/);
    expect(pageClient).toMatch(/getCharactersForTipping\(\)/);
    expect(pageClient).toMatch(/getAllCharacterSets\(\)/);
  });
});
