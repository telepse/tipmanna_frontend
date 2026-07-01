import { describe, it, expect } from "vitest";
import { isOptimizableImageSrc } from "@/lib/image-src";

describe("isOptimizableImageSrc", () => {
  it("treats local and data URLs as optimizable", () => {
    expect(isOptimizableImageSrc("/img/logo.png")).toBe(true);
    expect(isOptimizableImageSrc("data:image/png;base64,AAAA")).toBe(true);
  });

  it("allows configured remote hosts", () => {
    expect(
      isOptimizableImageSrc("https://res.cloudinary.com/demo/a.jpg")
    ).toBe(true);
    expect(isOptimizableImageSrc("https://img.youtube.com/vi/x/0.jpg")).toBe(
      true
    );
    expect(isOptimizableImageSrc("https://i.ytimg.com/vi/x/0.jpg")).toBe(true);
  });

  it("rejects unconfigured hosts (would throw in next/image default loader)", () => {
    // The regression: an arbitrary content-supplied host crashed the surface.
    expect(
      isOptimizableImageSrc(
        "https://drive.google.com/file/d/1abc/view?pli=1"
      )
    ).toBe(false);
    expect(isOptimizableImageSrc("https://example.com/a.png")).toBe(false);
  });

  it("rejects empty, nullish, and malformed values", () => {
    expect(isOptimizableImageSrc(undefined)).toBe(false);
    expect(isOptimizableImageSrc(null)).toBe(false);
    expect(isOptimizableImageSrc("")).toBe(false);
    expect(isOptimizableImageSrc("not a url")).toBe(false);
  });
});
