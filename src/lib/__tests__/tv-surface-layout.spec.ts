import { describe, expect, it } from "vitest";

import {
  isPhoneSurface,
  isWideSurface,
  resolveTvSurfaceMode,
  tvLooperLayoutFromSurfaceMode,
} from "@/lib/tv-surface-layout";

describe("resolveTvSurfaceMode", () => {
  it("returns null when dimensions are not ready", () => {
    expect(
      resolveTvSurfaceMode({ width: 0, height: 844, landscape: false })
    ).toBeNull();
    expect(
      resolveTvSurfaceMode({ width: 390, height: 0, landscape: false })
    ).toBeNull();
  });

  it("maps phone portrait", () => {
    expect(
      resolveTvSurfaceMode({
        width: 390,
        height: 844,
        landscape: false,
      })
    ).toBe("phonePortrait");
  });

  it("maps phone landscape via short viewport height", () => {
    expect(
      resolveTvSurfaceMode({
        width: 844,
        height: 390,
        landscape: true,
      })
    ).toBe("phoneLandscape");
  });

  it("maps tablet and desktop", () => {
    expect(
      resolveTvSurfaceMode({
        width: 768,
        height: 1024,
        landscape: false,
      })
    ).toBe("tablet");
    expect(
      resolveTvSurfaceMode({
        width: 1440,
        height: 900,
        landscape: true,
      })
    ).toBe("desktop");
  });
});

describe("surface helpers", () => {
  it("isPhoneSurface and isWideSurface", () => {
    expect(isPhoneSurface("phonePortrait")).toBe(true);
    expect(isPhoneSurface("phoneLandscape")).toBe(true);
    expect(isPhoneSurface("tablet")).toBe(false);
    expect(isWideSurface("tablet")).toBe(true);
    expect(isWideSurface("desktop")).toBe(true);
    expect(isWideSurface("phonePortrait")).toBe(false);
  });

  it("tvLooperLayoutFromSurfaceMode", () => {
    expect(tvLooperLayoutFromSurfaceMode("phonePortrait", false)).toBe(
      "mobileInline"
    );
    expect(tvLooperLayoutFromSurfaceMode("phoneLandscape", false)).toBe(
      "mobileImmersive"
    );
    expect(tvLooperLayoutFromSurfaceMode("phonePortrait", true)).toBe(
      "mobileImmersive"
    );
    expect(tvLooperLayoutFromSurfaceMode("tablet", false)).toBe("wideInline");
    expect(tvLooperLayoutFromSurfaceMode("desktop", false)).toBe("wideInline");
  });
});
