import { describe, expect, it } from "vitest";

/** Mirrors tv-interactive-shell payment surface selection. */
function resolveTvPaymentSurface(
  scheduleSourceCommunityId: string | null | undefined
): "community_tv_looper" | "tv_looper" {
  return scheduleSourceCommunityId ? "community_tv_looper" : "tv_looper";
}

describe("TV payment surface", () => {
  it("uses community_tv_looper when community source is set", () => {
    expect(resolveTvPaymentSurface("community-1")).toBe("community_tv_looper");
  });

  it("uses tv_looper for global TV", () => {
    expect(resolveTvPaymentSurface(null)).toBe("tv_looper");
    expect(resolveTvPaymentSurface(undefined)).toBe("tv_looper");
  });
});
