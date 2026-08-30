"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  subscribeTvEventCatalog,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";

export function useTvEventCatalog(eventId: string): {
  catalog: TvEventCatalog | null;
  loading: boolean;
} {
  const trimmed = eventId.trim();

  const catalog = useSyncExternalStore(
    subscribeTvEventCatalog,
    () => (trimmed ? getCachedTvEventCatalog(trimmed) : null),
    () => null
  );

  useEffect(() => {
    if (!trimmed) return;
    void loadTvEventCatalog(trimmed);
  }, [trimmed]);

  return {
    catalog,
    loading: Boolean(trimmed) && !catalog,
  };
}
