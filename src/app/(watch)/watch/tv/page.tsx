import type { Metadata } from "next";

import { WatchTvPageClient } from "@/components/watch/watch-tv-page-client";

export const metadata: Metadata = {
  title: "Tipmanna Watch — Live TV",
};

export default function WatchTvPage() {
  return <WatchTvPageClient />;
}
