import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const landingSrc = readFileSync(
  resolve(__dirname, "../../components/tiplink/tiplink-landing-client.tsx"),
  "utf8"
);
const policySrc = readFileSync(
  resolve(__dirname, "../tiplink-audio-policy.ts"),
  "utf8"
);

describe("TipLink audio wiring", () => {
  it("landing uses TipLink audio policy resolvers", () => {
    expect(landingSrc).toContain("resolveTipLinkPlayerAudioProps");
    expect(landingSrc).toContain("resolveTipLinkSurfaceTapAction");
    expect(landingSrc).toContain("shouldDeferTipLinkProgrammaticUnmute");
    expect(landingSrc).toContain('data-testid="tiplink-tap-for-sound"');
    expect(landingSrc).toContain("tiplink-open-in-browser-banner");
  });

  it("does not couple TipLink audio to Explore audio lock modules", () => {
    expect(landingSrc).not.toContain("explore-reel-audio-policy");
    expect(landingSrc).not.toContain("explore-reel-activation");
    expect(landingSrc).not.toContain("explore-never-playing");
    expect(policySrc).not.toMatch(/from ["']@\/lib\/explore/);
    expect(policySrc).not.toMatch(/from ["']\.\.\/explore/);
  });

  it("landing still routes analytics through tiplink adapter only", () => {
    expect(landingSrc).toContain("@/lib/analytics/tiplink-analytics");
    expect(landingSrc).not.toMatch(/@\/lib\/analytics-sdk/);
  });
});
