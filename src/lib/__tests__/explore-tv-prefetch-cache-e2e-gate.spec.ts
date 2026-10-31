import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Explore TV prefetch cache E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../explore-tv-prefetch-cache.ts"),
    "utf8"
  );

  it("skips TV schedule Server Action under ActiveOnClient", () => {
    const fetchBlock = src.slice(
      src.indexOf("async function fetchTvSnapshot"),
      src.indexOf("export function prefetchExploreTvSchedule")
    );
    expect(fetchBlock).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(fetchBlock).toMatch(/return null/);

    const prefetch = src.slice(
      src.indexOf("export function prefetchExploreTvSchedule"),
      src.indexOf("export function takeExploreTvPrefetch")
    );
    expect(prefetch).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
  });
});
