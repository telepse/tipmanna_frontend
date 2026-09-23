import { describe, expect, it } from "vitest";

import {
  resolveTipLinkTickerMode,
  tipLinkTickerExtras,
} from "@/lib/tiplink-ticker-mode";

describe("tipLink ticker mode", () => {
  it("keeps scroll labels and hides nav chips", () => {
    const mode = resolveTipLinkTickerMode({
      isLandscapeEnlarge: false,
      isEnlargeMode: false,
    });
    expect(mode).toBe("scroll");
    expect(tipLinkTickerExtras(mode)).toEqual({
      hideActionLabels: false,
      showNavActions: false,
    });
  });

  it("hides labels on portrait enlarge without nav chips", () => {
    const mode = resolveTipLinkTickerMode({
      isLandscapeEnlarge: false,
      isEnlargeMode: true,
    });
    expect(mode).toBe("enlarge");
    expect(tipLinkTickerExtras(mode)).toEqual({
      hideActionLabels: true,
      showNavActions: false,
    });
  });

  it("shows overlay nav chips only in phone landscape enlarge", () => {
    const mode = resolveTipLinkTickerMode({
      isLandscapeEnlarge: true,
      isEnlargeMode: true,
    });
    expect(mode).toBe("landscapeOverlay");
    expect(tipLinkTickerExtras(mode)).toEqual({
      hideActionLabels: true,
      showNavActions: true,
    });
  });
});
