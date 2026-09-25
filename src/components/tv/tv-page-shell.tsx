/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import TVPageClientWrapper from "./tv-page-client-wrapper";
import { ClientErrorBoundary } from "@/components/client-error-boundary";
import type {
  TvInitialTipCatalog,
  TvSsrScheduleBootstrap,
} from "@/lib/tv-ssr-live-tip-catalog";

type Props = {
  channels?: any[];
  characters: any[];
  characterSets?: any[];
  initialTvTipCatalog?: TvInitialTipCatalog | null;
  ssrScheduleBootstrap?: TvSsrScheduleBootstrap | null;
};

export default function TVPageShell({
  channels = [],
  characters,
  initialTvTipCatalog = null,
  ssrScheduleBootstrap = null,
}: Props) {
  return (
    <ClientErrorBoundary>
      <TVPageClientWrapper
        channels={channels}
        characters={characters}
        initialTvTipCatalog={initialTvTipCatalog}
        ssrScheduleBootstrap={ssrScheduleBootstrap}
      />
    </ClientErrorBoundary>
  );
}
