import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TvYoutubeSsrPreconnect } from "../../components/tv/tv-youtube-ssr-preconnect";
import {
  countYoutubePreconnectsInMarkup,
  extractYoutubeApiConnectionTiming,
  getTvYoutubeSsrPreconnectLinks,
  isTvSsrYoutubePreconnectEnabled,
} from "../tv-youtube-preconnect-config";

const ORIGINAL = process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT;
});

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT;
  } else {
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT = ORIGINAL;
  }
});

describe("isTvSsrYoutubePreconnectEnabled", () => {
  it("is off by default", () => {
    expect(isTvSsrYoutubePreconnectEnabled()).toBe(false);
    expect(getTvYoutubeSsrPreconnectLinks()).toEqual([]);
  });

  it("activates for 1 or true", () => {
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT = "1";
    expect(isTvSsrYoutubePreconnectEnabled()).toBe(true);
    expect(getTvYoutubeSsrPreconnectLinks()).toHaveLength(4);
  });
});

describe("TvYoutubeSsrPreconnect server markup", () => {
  it("renders both required preconnects with crossorigin on nocookie when flag on", () => {
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT = "1";
    const markup = renderToStaticMarkup(createElement(TvYoutubeSsrPreconnect));
    const counts = countYoutubePreconnectsInMarkup(markup);

    expect(counts.youtubeCom).toBe(1);
    expect(counts.youtubeNocookieCom).toBe(1);
    expect(markup).toContain('href="https://www.youtube.com"');
    expect(markup).toContain('href="https://www.youtube-nocookie.com"');
    expect(markup).toContain('crossorigin="anonymous"');
    expect(counts.dnsPrefetchYoutubeCom).toBeGreaterThanOrEqual(1);
    expect(counts.dnsPrefetchNocookieCom).toBeGreaterThanOrEqual(1);
    expect(markup).not.toContain("iframe_api");
    expect(markup).not.toContain("/embed/");
  });

  it("renders nothing when flag off", () => {
    const markup = renderToStaticMarkup(createElement(TvYoutubeSsrPreconnect));
    expect(markup).toBe("");
  });
});

describe("extractYoutubeApiConnectionTiming", () => {
  function fakeTiming(
    overrides: Partial<PerformanceResourceTiming>
  ): PerformanceResourceTiming {
    return {
      name: "https://www.youtube.com/iframe_api",
      entryType: "resource",
      startTime: 100,
      ...overrides,
    } as PerformanceResourceTiming;
  }

  it("computes DNS, connect, TLS, request wait and response durations", () => {
    const timing = extractYoutubeApiConnectionTiming(
      fakeTiming({
        domainLookupStart: 100,
        domainLookupEnd: 120,
        connectStart: 120,
        connectEnd: 200,
        secureConnectionStart: 150,
        requestStart: 200,
        responseStart: 250,
        responseEnd: 400,
      })
    );

    expect(timing.youtubeApiDnsDurationMs).toBe(20);
    expect(timing.youtubeApiConnectDurationMs).toBe(80);
    expect(timing.youtubeApiTlsDurationMs).toBe(50);
    expect(timing.youtubeApiRequestWaitDurationMs).toBe(50);
    expect(timing.youtubeApiResponseDurationMs).toBe(150);
    expect(timing.youtubeApiConnectionReusedOrPreconnected).toBe(false);
  });

  it("infers preconnected/reused connection when connect and DNS are zero", () => {
    const timing = extractYoutubeApiConnectionTiming(
      fakeTiming({
        domainLookupStart: 0,
        domainLookupEnd: 0,
        connectStart: 0,
        connectEnd: 0,
        requestStart: 100,
        responseStart: 150,
        responseEnd: 300,
      })
    );

    expect(timing.youtubeApiDnsDurationMs).toBeNull();
    expect(timing.youtubeApiConnectDurationMs).toBeNull();
    expect(timing.youtubeApiConnectionReusedOrPreconnected).toBe(true);
    expect(timing.youtubeApiResponseDurationMs).toBe(150);
  });

  it("returns null fields when cross-origin timing is unavailable", () => {
    const timing = extractYoutubeApiConnectionTiming(
      fakeTiming({
        domainLookupStart: 0,
        domainLookupEnd: 0,
        connectStart: 0,
        connectEnd: 0,
        requestStart: 0,
        responseStart: 0,
        responseEnd: 0,
      })
    );

    expect(timing.youtubeApiDnsDurationMs).toBeNull();
    expect(timing.youtubeApiConnectDurationMs).toBeNull();
    expect(timing.youtubeApiTlsDurationMs).toBeNull();
    expect(timing.youtubeApiRequestWaitDurationMs).toBeNull();
    expect(timing.youtubeApiResponseDurationMs).toBeNull();
    expect(timing.youtubeApiConnectionReusedOrPreconnected).toBeNull();
  });
});

describe("TV route scope", () => {
  it("TV layout imports SSR preconnect; root layout does not", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const root = join(process.cwd(), "src");
    const tvLayout = readFileSync(join(root, "app/(tv)/layout.tsx"), "utf8");
    const rootLayout = readFileSync(join(root, "app/layout.tsx"), "utf8");

    expect(tvLayout).toContain("TvYoutubeSsrPreconnect");
    expect(rootLayout).not.toContain("TvYoutubeSsrPreconnect");
    expect(rootLayout).not.toContain("NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT");
  });
});
