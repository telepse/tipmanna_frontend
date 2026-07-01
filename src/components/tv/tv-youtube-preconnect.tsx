"use client";

import { preconnect, prefetchDNS } from "react-dom";

let preconnected = false;

/** Early YouTube connection hints for TV player embed (App Router client layout). */
export function TvYoutubePreconnect() {
  if (!preconnected && typeof window !== "undefined") {
    preconnected = true;
    preconnect("https://www.youtube-nocookie.com", {
      crossOrigin: "anonymous",
    });
    preconnect("https://i.ytimg.com");
    preconnect("https://www.youtube.com");
    prefetchDNS("https://www.youtube-nocookie.com");
    prefetchDNS("https://i.ytimg.com");
  }
  return null;
}
