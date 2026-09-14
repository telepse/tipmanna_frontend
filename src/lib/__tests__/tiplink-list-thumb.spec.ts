import { describe, expect, it } from "vitest";

import {
  tipLinkListThumb,
  tipLinkThumbClassName,
} from "@/lib/tiplink-eligible-videos";

describe("tiplink list thumb", () => {
  it("prefers custom banner over YouTube hqdefault", () => {
    expect(
      tipLinkListThumb(
        "https://cdn.example/banner.jpg",
        "https://www.youtube.com/watch?v=abc12345678"
      )
    ).toBe("https://cdn.example/banner.jpg");
  });

  it("falls back to YouTube hqdefault when no custom banner", () => {
    expect(
      tipLinkListThumb(null, "https://www.youtube.com/watch?v=abc12345678")
    ).toBe("https://img.youtube.com/vi/abc12345678/hqdefault.jpg");
  });

  it("maps banner aspect to css classes", () => {
    expect(tipLinkThumbClassName("square")).toContain("aspect-square");
    expect(tipLinkThumbClassName(null)).toContain("aspect-video");
  });
});
