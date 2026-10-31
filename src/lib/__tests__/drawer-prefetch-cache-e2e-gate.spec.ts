import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Drawer prefetch cache Explore E2E gate", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../drawer-prefetch-cache.ts"),
    "utf8"
  );

  it("gates community access and drawer warmers under ActiveOnClient", () => {
    const access = src.slice(
      src.indexOf("export async function fetchCommunityAccessStateCached"),
      src.indexOf("export function prefetchCommunityAccessState")
    );
    expect(access).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);

    const prefetch = src.slice(
      src.indexOf("export function prefetchCommunityAccessState"),
      src.indexOf("export function prefetchDrawerUiChunks")
    );
    expect(prefetch).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);

    const channel = src.slice(
      src.indexOf("export function prefetchChannelDrawers"),
      src.indexOf("export async function prefetchProfileDrawerData")
    );
    expect(channel).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);

    const profile = src.slice(
      src.indexOf("export async function prefetchProfileDrawerData"),
      src.indexOf("export function getCachedProfileDrawerData")
    );
    expect(profile).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
  });
});
