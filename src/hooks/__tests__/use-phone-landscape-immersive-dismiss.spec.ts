import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const OVERLAY_AWARE_LOCK =
  "lockFullLandscape: isOverlay ? false : showPhoneLandscapeImmersive";

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
    expect(contentSrc).toContain(OVERLAY_AWARE_LOCK);
    expect(channelSrc).toContain(OVERLAY_AWARE_LOCK);
    expect(contentSrc).toContain("stackAbovePlaybackOverlay={isOverlay}");
    expect(channelSrc).toContain("stackAbovePlaybackOverlay={isOverlay}");
    expect(contentSrc).toContain("immersiveInPlayerSecondaryActionsClassName");
    expect(channelSrc).toContain("immersiveInPlayerSecondaryActionsClassName");
    expect(contentSrc).toContain("immersiveInPlayerMetricsClusterClassName");
    expect(channelSrc).toContain("immersiveInPlayerMetricsClusterClassName");
    expect(contentSrc).toContain("immersiveChromeOpen");
    expect(channelSrc).toContain("immersiveChromeOpen");
    expect(contentSrc).toContain(
      'isFullView && isMobile\n                  ? "pointer-events-auto absolute top-1/2 right-7 z-[1110]'
    );
    expect(channelSrc).toContain(
      'isFullView && isMobile\n                  ? "pointer-events-auto absolute top-1/2 right-7 z-[1110]'
    );
    expect(contentSrc).toContain("OVERLAY_RAIL_DOCK_CLEARANCE_CLASS");
    expect(channelSrc).toContain("OVERLAY_RAIL_DOCK_CLEARANCE_CLASS");
    expect(contentSrc).toContain("overlayPhoneChrome");
    expect(channelSrc).toContain("overlayPhoneChrome");
    expect(contentSrc).toContain("aspectAwareInlineChrome: overlayPhoneChrome");
    expect(channelSrc).toContain("aspectAwareInlineChrome: overlayPhoneChrome");
    expect(contentSrc).toContain(
      '!(overlayPhoneChrome || mobileOverlayImmersive) && "sm:hidden"'
    );
    expect(channelSrc).toContain(
      '!(overlayPhoneChrome || mobileOverlayImmersive) && "sm:hidden"'
    );
  });
});
