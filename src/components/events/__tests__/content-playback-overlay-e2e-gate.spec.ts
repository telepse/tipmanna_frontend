import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ContentPlaybackOverlay Explore E2E gates", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../content-playback-overlay.tsx"),
    "utf8"
  );

  it("skips Phase B Server Actions under ActiveOnClient", () => {
    expect(src).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    const phaseGate = src.slice(
      src.indexOf("Dual-gate: keep Phase-A seed only"),
      src.indexOf("getContentChannelAction(eventId)")
    );
    expect(phaseGate).toMatch(/isExploreE2eFixturesActiveOnClient\(\)/);
    expect(phaseGate).toMatch(/return;/);
  });

  it("renders E2E overlay shell instead of ContentClient under ActiveOnClient", () => {
    expect(src).toMatch(/data-e2e-overlay-shell="1"/);
    expect(src).toMatch(
      /payload && isExploreE2eFixturesActiveOnClient\(\)/
    );
  });

  it("emits community_featured_overlay v2 playback hooks from E2E shell (S7b)", () => {
    expect(src).toMatch(/trackCommunityFeaturedOverlayOpen/);
    expect(src).toMatch(/communityFeaturedOverlayPlaybackOnPlayStateChange/);
    expect(src).toMatch(/communityFeaturedOverlayPlaybackWatchSegment/);
    expect(src).toMatch(
      /paymentSurface !== "community_featured_overlay"/
    );
  });

  it("loads community_featured_overlay surface chunk on E2E open (S7 post-open marker)", () => {
    expect(src).toMatch(
      /import\("@\/lib\/analytics-sdk\/community-featured-overlay-playback"\)/
    );
    const markerEffect = src.slice(
      src.indexOf("S7 post-open scan"),
      src.indexOf("Dual-gate: keep Phase-A seed only")
    );
    expect(markerEffect).toMatch(/!payload \|\| !isExploreE2eFixturesActiveOnClient\(\)/);
    expect(markerEffect).toMatch(/community-featured-overlay-playback/);
  });

  it("still mounts ContentClient for non-E2E payload path", () => {
    expect(src).toMatch(/<ContentClient/);
    expect(src).toMatch(/getContentChannelAction/);
    expect(src).toMatch(/getCharactersForTipping/);
    expect(src).toMatch(/getEventByIdAction/);
  });
});
