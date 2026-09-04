"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";
import type { RoomCharacter } from "@/types";

export function useTvEventTipCatalog(
  eventId: string,
  fallbackCharacters: RoomCharacter[]
): {
  catalog: TvEventCatalog | null;
  tippingCharacters: RoomCharacter[];
  characterSets: TvEventCatalog["characterSets"];
} {
  const [catalog, setCatalog] = useState<TvEventCatalog | null>(() =>
    eventId ? getCachedTvEventCatalog(eventId) : null
  );

  useEffect(() => {
    if (!eventId) {
      setCatalog(null);
      return;
    }

    setCatalog(getCachedTvEventCatalog(eventId));

    let cancelled = false;
    void loadTvEventCatalog(eventId).then(next => {
      if (!cancelled) setCatalog(next);
    });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const tippingCharacters = useMemo(
    () =>
      (catalog?.characters?.length
        ? catalog.characters
        : fallbackCharacters) as RoomCharacter[],
    [catalog?.characters, fallbackCharacters]
  );

  const characterSets = useMemo(
    () =>
      (catalog?.characterSets ?? []).filter(
        set => Array.isArray(set.characters) && set.characters.length > 0
      ),
    [catalog?.characterSets]
  );

  return { catalog, tippingCharacters, characterSets };
}
