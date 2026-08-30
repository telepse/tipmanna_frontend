import { describe, expect, it } from "vitest";

import { resolveRoomOgImage } from "@/lib/room-og-image";

describe("resolveRoomOgImage", () => {
  it("prefers a YouTube thumbnail from the default video URL", () => {
    const image = resolveRoomOgImage(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://cdn.example.com/banner.jpg"
    );
    expect(image).toContain("img.youtube.com");
    expect(image).not.toBe("dQw4w9WgXcQ");
  });

  it("falls back to event banner when video URL is missing", () => {
    expect(resolveRoomOgImage(null, "https://cdn.example.com/banner.jpg")).toBe(
      "https://cdn.example.com/banner.jpg"
    );
  });

  it("returns empty string when neither video nor banner is available", () => {
    expect(resolveRoomOgImage(undefined, "   ")).toBe("");
  });
});
