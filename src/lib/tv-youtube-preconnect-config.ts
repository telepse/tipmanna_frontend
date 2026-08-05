/**
 * Phase C2.1 — TV-route YouTube connection hints (SSR + client deduplication).
 * Observational config only; no script preload or player changes.
 */

export type TvYoutubePreconnectOrigin =
  | "www.youtube.com"
  | "www.youtube-nocookie.com";

export type TvYoutubeSsrPreconnectLink = {
  rel: "preconnect" | "dns-prefetch";
  href: string;
  crossOrigin?: "anonymous";
  originCategory: TvYoutubePreconnectOrigin;
};

const SSR_PRECONNECT_ORIGINS: TvYoutubePreconnectOrigin[] = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
];

export function isTvSsrYoutubePreconnectEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT === "true" ||
    process.env.NEXT_PUBLIC_TV_SSR_YOUTUBE_PRECONNECT === "1"
  );
}

/** Origins emitted in SSR HTML when the C2.1 flag is on. */
export function getTvSsrYoutubePreconnectOrigins(): TvYoutubePreconnectOrigin[] {
  if (!isTvSsrYoutubePreconnectEnabled()) return [];
  return [...SSR_PRECONNECT_ORIGINS];
}

/**
 * Link descriptors for the TV route server layout (hoisted to document head).
 * Does not include i.ytimg.com — not required during critical iframe_api bootstrap.
 */
export function getTvYoutubeSsrPreconnectLinks(): TvYoutubeSsrPreconnectLink[] {
  if (!isTvSsrYoutubePreconnectEnabled()) return [];

  return [
    {
      rel: "preconnect",
      href: "https://www.youtube-nocookie.com",
      crossOrigin: "anonymous",
      originCategory: "www.youtube-nocookie.com",
    },
    {
      rel: "preconnect",
      href: "https://www.youtube.com",
      originCategory: "www.youtube.com",
    },
    {
      rel: "dns-prefetch",
      href: "//www.youtube-nocookie.com",
      originCategory: "www.youtube-nocookie.com",
    },
    {
      rel: "dns-prefetch",
      href: "//www.youtube.com",
      originCategory: "www.youtube.com",
    },
  ];
}

/** Origins the client TvYoutubePreconnect must skip when SSR hints are active. */
export function getTvClientPreconnectOriginsSkippedWhenSsr(): Set<string> {
  return new Set([
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "//www.youtube.com",
    "//www.youtube-nocookie.com",
  ]);
}

/** Simpler counter for tests: preconnect href occurrences per origin. */
export function countYoutubePreconnectsInMarkup(markup: string): {
  youtubeCom: number;
  youtubeNocookieCom: number;
  dnsPrefetchYoutubeCom: number;
  dnsPrefetchNocookieCom: number;
} {
  const preconnectBlocks =
    markup.match(/<link[^>]+rel="preconnect"[^>]*>/g) ?? [];
  return {
    youtubeCom: preconnectBlocks.filter(b =>
      b.includes('href="https://www.youtube.com"')
    ).length,
    youtubeNocookieCom: preconnectBlocks.filter(b =>
      b.includes('href="https://www.youtube-nocookie.com"')
    ).length,
    dnsPrefetchYoutubeCom:
      (
        markup.match(/rel="dns-prefetch"[^>]*href="\/\/www\.youtube\.com"/g) ??
        []
      ).length +
      (
        markup.match(/href="\/\/www\.youtube\.com"[^>]*rel="dns-prefetch"/g) ??
        []
      ).length,
    dnsPrefetchNocookieCom:
      (
        markup.match(
          /rel="dns-prefetch"[^>]*href="\/\/www\.youtube-nocookie\.com"/g
        ) ?? []
      ).length +
      (
        markup.match(
          /href="\/\/www\.youtube-nocookie\.com"[^>]*rel="dns-prefetch"/g
        ) ?? []
      ).length,
  };
}

export type YoutubeApiConnectionTimingFields = {
  youtubeApiDnsDurationMs: number | null;
  youtubeApiConnectDurationMs: number | null;
  youtubeApiTlsDurationMs: number | null;
  youtubeApiRequestWaitDurationMs: number | null;
  youtubeApiResponseDurationMs: number | null;
  youtubeApiConnectionReusedOrPreconnected: boolean | null;
};

function timingSegment(start: number, end: number): number | null {
  if (start <= 0 || end <= 0 || end < start) return null;
  return end - start;
}

/**
 * Resource Timing connection breakdown for iframe_api entries.
 * Returns null fields when cross-origin policy zeroes timestamps.
 */
export function extractYoutubeApiConnectionTiming(
  entry: PerformanceResourceTiming
): YoutubeApiConnectionTimingFields {
  const domainLookupStart = entry.domainLookupStart ?? 0;
  const domainLookupEnd = entry.domainLookupEnd ?? 0;
  const connectStart = entry.connectStart ?? 0;
  const connectEnd = entry.connectEnd ?? 0;
  const secureConnectionStart = entry.secureConnectionStart ?? 0;
  const requestStart = entry.requestStart ?? 0;
  const responseStart = entry.responseStart ?? 0;
  const responseEnd = entry.responseEnd ?? 0;

  const hasUsableTiming =
    responseStart > 0 || responseEnd > 0 || requestStart > 0 || connectEnd > 0;

  if (!hasUsableTiming) {
    return {
      youtubeApiDnsDurationMs: null,
      youtubeApiConnectDurationMs: null,
      youtubeApiTlsDurationMs: null,
      youtubeApiRequestWaitDurationMs: null,
      youtubeApiResponseDurationMs: null,
      youtubeApiConnectionReusedOrPreconnected: null,
    };
  }

  const dns = timingSegment(domainLookupStart, domainLookupEnd);
  const connect = timingSegment(connectStart, connectEnd);
  const tls =
    secureConnectionStart > 0
      ? timingSegment(secureConnectionStart, connectEnd)
      : null;
  const requestWait = timingSegment(requestStart, responseStart);
  const response = timingSegment(responseStart, responseEnd);

  let connectionReusedOrPreconnected: boolean | null = null;
  if (requestStart > 0) {
    const allConnectionZero =
      connectStart === 0 &&
      connectEnd === 0 &&
      domainLookupStart === 0 &&
      domainLookupEnd === 0;
    const hasConnectWork = connectStart > 0 && connectEnd > 0;
    if (allConnectionZero) {
      connectionReusedOrPreconnected = true;
    } else if (hasConnectWork) {
      connectionReusedOrPreconnected = false;
    }
  }

  return {
    youtubeApiDnsDurationMs: dns,
    youtubeApiConnectDurationMs: connect,
    youtubeApiTlsDurationMs: tls,
    youtubeApiRequestWaitDurationMs: requestWait,
    youtubeApiResponseDurationMs: response,
    youtubeApiConnectionReusedOrPreconnected: connectionReusedOrPreconnected,
  };
}
