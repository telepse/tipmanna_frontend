/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import TVPageClientWrapper from "./tv-page-client-wrapper";
import { TvCommunityAccessGate } from "./tv-community-access-gate";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import type {
  SsrCommunityTvViewerEntitlement,
  TvInitialTipCatalog,
  TvSsrScheduleBootstrap,
} from "@/lib/tv-ssr-live-tip-catalog";

type Props = {
  channels?: any[];
  characters: any[];
  characterSets?: any[];
  /** Server URL `community` param — stable on full document reload (avoids searchParams suspend). */
  urlCommunityIntent?: string | null;
  ssrCommunityTvViewerEntitlement?: SsrCommunityTvViewerEntitlement;
  ssrBootstrapCommunityId?: string | null;
  initialTvTipCatalog?: TvInitialTipCatalog | null;
  ssrScheduleBootstrap?: TvSsrScheduleBootstrap | null;
};

export default function TVPageShell({
  channels = [],
  characters,
  urlCommunityIntent = null,
  ssrCommunityTvViewerEntitlement = "unknown",
  ssrBootstrapCommunityId = null,
  initialTvTipCatalog = null,
  ssrScheduleBootstrap = null,
}: Props) {
  return (
    <ClientErrorBoundary>
      <TvCommunityAccessGate
        urlCommunityIntent={urlCommunityIntent}
        ssrCommunityTvViewerEntitlement={ssrCommunityTvViewerEntitlement}
      >
        <TVPageClientWrapper
          channels={channels}
          characters={characters}
          ssrBootstrapCommunityId={ssrBootstrapCommunityId}
          initialTvTipCatalog={initialTvTipCatalog}
          ssrScheduleBootstrap={ssrScheduleBootstrap}
        />
      </TvCommunityAccessGate>
    </ClientErrorBoundary>
  );
}
