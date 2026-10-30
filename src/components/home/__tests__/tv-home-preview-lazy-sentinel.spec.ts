import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("partner TV preview lazy sentinel + click-gated playback", () => {
  const lazySrc = fs.readFileSync(
    path.join(__dirname, "../tv-home-preview-section-lazy.tsx"),
    "utf8"
  );
  const sectionSrc = fs.readFileSync(
    path.join(__dirname, "../tv-home-preview-section.tsx"),
    "utf8"
  );

  it("lazy wrapper exposes data-partner-tv-preview-sentinel for S7 scroll", () => {
    expect(lazySrc).toMatch(/data-partner-tv-preview-sentinel=\"1\"/);
  });

  it("section keeps Watch live click-gated (no auto-start on intersection)", () => {
    expect(sectionSrc).toMatch(/Watch live/);
    expect(sectionSrc).not.toMatch(/if \(inView\) setWatchLive\(true\)/);
    expect(sectionSrc).toMatch(/setWatchLive\(true\)/);
  });
});
