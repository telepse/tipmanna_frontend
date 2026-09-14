"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";
import type { RoomCharacter } from "@/types";

/**
 * Per-event tip catalog for TV/explore playback surfaces.
 * Never falls back to the platform-wide character pool — wrong pool caused
 * tip strips to show characters outside the video's assigned drawer.
 */
export function useTvEventTipCatalog(eventId: string): {
  catalog: TvEventCatalog | null;
  tippingCharacters: RoomCharacter[];
  characterSets: TvEventCatalog["characterSets"];
  catalogLoading: boolean;
} {
  const [catalog, setCatalog] = useState<TvEventCatalog | null>(() =>
    eventId ? getCachedTvEventCatalog(eventId) : null
  );
  const [catalogLoading, setCatalogLoading] = useState(
    () => Boolean(eventId?.trim()) && !getCachedTvEventCatalog(eventId)
  );

  useEffect(() => {
    if (!eventId?.trim()) {
      setCatalog(null);
      setCatalogLoading(false);
      return;
    }

    const cached = getCachedTvEventCatalog(eventId);
    setCatalog(cached);
    setCatalogLoading(!cached);

    let cancelled = false;
    void loadTvEventCatalog(eventId).then(next => {
      if (!cancelled) {
        setCatalog(next);
        setCatalogLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const tippingCharacters = useMemo(
    () => (catalog?.characters ?? []) as RoomCharacter[],
    [catalog?.characters]
  );

  const characterSets = useMemo(
    () =>
      (catalog?.characterSets ?? []).filter(
        set => Array.isArray(set.characters) && set.characters.length > 0
      ),
    [catalog?.characterSets]
  );

  return { catalog, tippingCharacters, characterSets, catalogLoading };
}
