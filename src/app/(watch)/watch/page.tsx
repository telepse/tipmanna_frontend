import type { Metadata } from "next";

import { WatchHubTiles } from "@/components/watch/watch-hub-tiles";

export const metadata: Metadata = {
  title: "Tipmanna Watch",
  description: "TV, Explore, and Screen Display for smart TV browsers.",
};

export default function WatchHubPage() {
  return <WatchHubTiles />;
}
