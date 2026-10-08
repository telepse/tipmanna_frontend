"use client";

import TVProvider from "@/components/tv-provider";
import { TvYoutubePreconnect } from "@/components/tv/tv-youtube-preconnect";
import { TvDeviceSessionBootstrap } from "@/components/tv/tv-device-session-bootstrap";

import { WatchTvTheater } from "./watch-tv-theater";

/** System TV for /watch/tv — own TVProvider subtree (not /tv layout). */
export function WatchTvPageClient() {
  return (
    <TVProvider>
      <TvYoutubePreconnect />
      <TvDeviceSessionBootstrap />
      <WatchTvTheater />
    </TVProvider>
  );
}
