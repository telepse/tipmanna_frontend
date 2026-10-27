import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function assertSurfaceXor(componentPath: string, adapterImport: string): void {
  const src = read(componentPath);
  expect(src).toMatch(new RegExp(adapterImport.replace("/", "\\/")));
  expect(src).not.toMatch(/@\/lib\/analytics-sdk/);
  expect(src).not.toMatch(/trackTvVideoEncounter/);
  expect(src).not.toMatch(/trackTvVideoStart/);
  expect(src).not.toMatch(/trackTvWatchDuration/);
  expect(src).not.toMatch(/trackTvVideoComplete/);
  expect(src).not.toMatch(/initTvAnalyticsRuntime/);
  expect(src).not.toMatch(/setTvAnalyticsContext/);
}

describe("Wave 3 surface XOR (playback via adapters)", () => {
  it("content-client", () => {
    assertSurfaceXor(
      "components/events/content-client.tsx",
      "content-client-analytics"
    );
  });

  it("event-live (event_room)", () => {
    assertSurfaceXor(
      "components/events/event-live.tsx",
      "event-room-analytics"
    );
  });

  it("tiplink-landing-client", () => {
    assertSurfaceXor(
      "components/tiplink/tiplink-landing-client.tsx",
      "tiplink-analytics"
    );
  });

  it("tv-looper", () => {
    assertSurfaceXor("components/tv/tv-looper.tsx", "tv-looper-analytics");
  });

  it("home-tv-looper", () => {
    assertSurfaceXor("components/tv/home-tv-looper.tsx", "tv-looper-analytics");
  });

  it("tv-live-preview-player (homepage_preview on /partner)", () => {
    assertSurfaceXor(
      "components/home/tv-live-preview-player.tsx",
      "homepage-preview-analytics"
    );
    const src = read("components/home/tv-live-preview-player.tsx");
    expect(src).toMatch(/homepage_preview/);
    expect(src).not.toMatch(/analyticsSurface:\s*["']tv_looper["']/);
    expect(src).not.toMatch(/analyticsSurface:\s*["']community_tv_looper["']/);
  });

  it("tv-fullscreen", () => {
    assertSurfaceXor(
      "components/tv/tv-fullscreen.tsx",
      "tv-fullscreen-analytics"
    );
  });

  it("explore-feed-client", () => {
    assertSurfaceXor(
      "components/explore/explore-feed-client.tsx",
      "explore-feed-analytics"
    );
  });

  it("community-join-panel overlay open (no direct tvAnalytics)", () => {
    const src = read("components/community/community-join-panel.tsx");
    expect(src).toMatch(/community-featured-overlay-analytics/);
    expect(src).not.toMatch(/@\/lib\/analytics-sdk/);
    expect(src).not.toMatch(/trackTvVideoEncounter/);
    expect(src).not.toMatch(/initTvAnalyticsRuntime/);
  });
});
