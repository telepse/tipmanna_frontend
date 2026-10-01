import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  OVERLAY_RAIL_DOCK_CLEARANCE_CLASS,
  immersiveInPlayerSecondaryActionsClassName,
  immersiveMobileScrubberDockClassName,
} from "@/components/media/immersive-media-shell";

describe("overlay rail hit geometry", () => {
  it("rails sit under scrubber dock in z-order", () => {
    const rails = immersiveInPlayerSecondaryActionsClassName(
      true,
      true,
      "landscape_video"
    );
    const dock = immersiveMobileScrubberDockClassName("landscape_video");
    expect(rails).toContain("z-[1000]");
    expect(dock).toContain("z-[1110]");
    expect(OVERLAY_RAIL_DOCK_CLEARANCE_CLASS).toContain("bottom-[max(6.25rem");
  });

  it("content/channel immersive dock is pointer-transparent with clearance constant", () => {
    const contentSrc = readFileSync(
      resolve(process.cwd(), "src/components/events/content-client.tsx"),
      "utf8"
    );
    const channelSrc = readFileSync(
      resolve(process.cwd(), "src/components/events/channel-client.tsx"),
      "utf8"
    );
    for (const src of [contentSrc, channelSrc]) {
      expect(src).toContain("OVERLAY_RAIL_DOCK_CLEARANCE_CLASS");
      expect(src).toContain('mobileOverlayImmersive && "pointer-events-none"');
      expect(src).toContain("overlayPhoneChrome");
      expect(src).toContain("aspectAwareInlineChrome: overlayPhoneChrome");
      expect(src).toContain(
        '!(overlayPhoneChrome || mobileOverlayImmersive) && "sm:hidden"'
      );
      expect(src).toContain("chromeUsesMobileLayout");
      expect(src).toContain("overlayPhoneChrome ? null : (");
      expect(src).toContain("h-[25%] w-[100%] bg-black p-4");
    }
  });
});
