import type { Metadata } from "next";

import { WatchExploreTheater } from "@/components/watch/watch-explore-theater";

export const metadata: Metadata = {
  title: "Tipmanna Watch — Explore",
};

export default function WatchExplorePage() {
  return <WatchExploreTheater />;
}
