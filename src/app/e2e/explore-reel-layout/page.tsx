import { Suspense } from "react";

import { E2eExploreReelLayoutClient } from "./e2e-explore-reel-layout-client";

/** Isolated page for Playwright explore reel layout shell tests (no backend). */
export default function E2eExploreReelLayoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-[100dvh] items-center justify-center bg-black text-white/70" />
      }
    >
      <E2eExploreReelLayoutClient />
    </Suspense>
  );
}
