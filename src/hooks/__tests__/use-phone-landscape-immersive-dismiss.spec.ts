import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("usePhoneLandscapeImmersiveDismiss", () => {
  it("content/channel landscape close must not navigate to explore", () => {
    const contentSrc = readFileSync(
      resolve(process.cwd(), "src/components/events/content-client.tsx"),
      "utf8"
    );
    const channelSrc = readFileSync(
      resolve(process.cwd(), "src/components/events/channel-client.tsx"),
      "utf8"
    );
    expect(contentSrc).not.toContain('router.push("/explore")');
    expect(contentSrc).not.toContain("runPortraitAlignedMobileLandscapeClose");
    expect(channelSrc).not.toContain('router.push("/explore")');
    expect(channelSrc).not.toContain("runPortraitAlignedMobileLandscapeClose");
    expect(contentSrc).toContain("usePhoneLandscapeImmersiveDismiss");
    expect(channelSrc).toContain(
      "lockFullLandscape: showPhoneLandscapeImmersive"
    );
  });
});
