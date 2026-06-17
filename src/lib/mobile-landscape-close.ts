import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { prefetchExploreFeedInitial } from "@/lib/explore-feed-prefetch-cache";

/** Portrait-aligned exit for phone landscape (full view → inline; otherwise explore). */
export function runPortraitAlignedMobileLandscapeClose(
  router: AppRouterInstance,
  options?: {
    isFullView?: boolean;
    exitFull?: () => void;
    explorePath?: string;
  }
): void {
  if (options?.isFullView && options.exitFull) {
    options.exitFull();
    return;
  }
  prefetchExploreFeedInitial();
  router.push(options?.explorePath ?? "/explore");
}
