import { describe, expect, it } from "vitest";

import { getWave1ConfigRedirects } from "@/lib/config-redirects";

describe("getWave1ConfigRedirects (Wave 1A)", () => {
  const redirects = getWave1ConfigRedirects();

  it("uses permanent:true (HTTP 308) for every rule", () => {
    expect(redirects.every(r => r.permanent === true)).toBe(true);
  });

  it("redirects tipmanna.live paths to tipmanna.tv with path placeholder", () => {
    const rule = redirects.find(
      r => r.has?.[0]?.value === "tipmanna.live"
    );
    expect(rule).toMatchObject({
      source: "/:path*",
      destination: "https://tipmanna.tv/:path*",
      permanent: true,
    });
  });

  it("redirects www.tipmanna.live to www.tipmanna.tv (not apex)", () => {
    const rule = redirects.find(
      r => r.has?.[0]?.value === "www.tipmanna.live"
    );
    expect(rule).toMatchObject({
      source: "/:path*",
      destination: "https://www.tipmanna.tv/:path*",
      permanent: true,
    });
    expect(rule?.destination).not.toBe("https://tipmanna.tv/:path*");
  });

  it("does not attach host conditions to tipmanna.tv or unrelated hosts", () => {
    const hostValues = redirects.flatMap(
      r => r.has?.map(h => h.value) ?? []
    );
    expect(hostValues).toEqual(["tipmanna.live", "www.tipmanna.live"]);
    expect(hostValues).not.toContain("tipmanna.tv");
    expect(hostValues).not.toContain("www.tipmanna.tv");
    expect(hostValues).not.toContain("tipmanna.com");
  });

  it("redirects `/` to `/explore` after host rules (no host filter)", () => {
    const root = redirects.find(r => r.source === "/" && !r.has);
    expect(root).toMatchObject({
      destination: "/explore",
      permanent: true,
    });
    const liveIdx = redirects.findIndex(
      r => r.has?.[0]?.value === "tipmanna.live"
    );
    const rootIdx = redirects.findIndex(r => r.source === "/" && !r.has);
    expect(liveIdx).toBeGreaterThanOrEqual(0);
    expect(rootIdx).toBeGreaterThan(liveIdx);
  });

  it("does not define .com redirects (remain in middleware)", () => {
    expect(
      redirects.some(r => r.has?.some(h => h.value.includes("tipmanna.com")))
    ).toBe(false);
  });
});
