"use client";

import { preconnect, prefetchDNS } from "react-dom";
import {
  getTvClientPreconnectOriginsSkippedWhenSsr,
  isTvSsrYoutubePreconnectEnabled,
} from "@/lib/tv-youtube-preconnect-config";

let preconnected = false;

/** Early YouTube connection hints for TV player embed (client fallback when SSR off). */
export function TvYoutubePreconnect() {
  if (!preconnected && typeof window !== "undefined") {
    preconnected = true;
    const ssrHintsActive = isTvSsrYoutubePreconnectEnabled();
    const skipped = getTvClientPreconnectOriginsSkippedWhenSsr();

    if (!ssrHintsActive || !skipped.has("https://www.youtube-nocookie.com")) {
      preconnect("https://www.youtube-nocookie.com", {
        crossOrigin: "anonymous",
      });
    }
    if (!ssrHintsActive || !skipped.has("https://www.youtube.com")) {
      preconnect("https://www.youtube.com");
    }
    if (!ssrHintsActive || !skipped.has("https://www.youtube-nocookie.com")) {
      prefetchDNS("https://www.youtube-nocookie.com");
    }

    // Thumbnail CDN — client-only (not part of C2.1 SSR hint set).
    preconnect("https://i.ytimg.com");
    if (!ssrHintsActive) {
      prefetchDNS("https://i.ytimg.com");
    }
  }
  return null;
}

/** Test-only reset for client preconnect singleton. */
export function __resetTvYoutubePreconnectForTest(): void {
  preconnected = false;
}
