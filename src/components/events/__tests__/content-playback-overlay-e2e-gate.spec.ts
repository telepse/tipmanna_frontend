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

  it("still mounts ContentClient for non-E2E payload path", () => {
    expect(src).toMatch(/<ContentClient/);
    expect(src).toMatch(/getContentChannelAction/);
    expect(src).toMatch(/getCharactersForTipping/);
    expect(src).toMatch(/getEventByIdAction/);
  });
});
