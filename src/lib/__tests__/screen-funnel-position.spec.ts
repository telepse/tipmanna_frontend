import { describe, expect, it } from "vitest";

import {
  funnelCornerClassName,
  normalizeScreenFunnelPosition,
} from "@/lib/screen-funnel-position";

describe("funnelCornerClassName", () => {
  it("overlay uses vmin insets without conflicting top-0/top-4", () => {
    const cls = funnelCornerClassName("bottom_left", "overlay");
    expect(cls).toContain("bottom-[2vmin]");
    expect(cls).not.toMatch(/\btop-0\b/);
    expect(cls).not.toMatch(/\bbottom-0\b/);
  });

  it("opaque mobile bottom-left uses bottom-2 left-2", () => {
    const cls = funnelCornerClassName("bottom_left", "opaque", true);
    expect(cls).toBe("absolute bottom-2 left-2");
  });

  it("opaque desktop bottom-left uses bottom-4 left-4", () => {
    const cls = funnelCornerClassName("bottom_left", "opaque", false);
    expect(cls).toBe("absolute bottom-4 left-4");
  });

  it("normalize defaults invalid to bottom_left", () => {
    expect(normalizeScreenFunnelPosition("invalid")).toBe("bottom_left");
  });
});
