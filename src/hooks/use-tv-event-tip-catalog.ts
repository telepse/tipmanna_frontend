"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCachedTvEventCatalog,
  loadTvEventCatalog,
  primeTvEventCatalog,
  subscribeTvEventCatalog,
  type TvEventCatalog,
} from "@/lib/tv-event-catalog-cache";
import type { TvInitialTipCatalog } from "@/lib/tv-ssr-live-tip-catalog";
import type { RoomCharacter } from "@/types";

export type TvEventTipCatalogInitial = Pick<
  TvInitialTipCatalog,
  "eventId" | "characterSets" | "characters"
>;

/** SSR live-row catalog before the client schedule exposes an event id. */
export function catalogFromPendingInitial(
  initial?: TvEventTipCatalogInitial | null
): TvEventCatalog | null {
  if (!initial?.eventId?.trim()) return null;
  return {
    characterSets: initial.characterSets ?? [],
    characters: initial.characters ?? [],
  };
}

export function catalogFromMatchingInitial(
  eventId: string,
  initial?: TvEventTipCatalogInitial | null
): TvEventCatalog | null {
  if (!initial?.eventId?.trim() || initial.eventId.trim() !== eventId.trim()) {
    return null;
  }
  return {
    characterSets: initial.characterSets ?? [],
    characters: initial.characters ?? [],
  };
}

export type ResolveDisplayedTvEventCatalogInput = {
  eventId: string;
  stored: TvEventCatalog | null;
  storedEventId: string | null;
  initial?: TvEventTipCatalogInitial | null;
  allowPendingInitial: boolean;
};

/** Same-render catalog for TV — never show stored data for a different event id. */
export function resolveDisplayedTvEventCatalog(
  input: ResolveDisplayedTvEventCatalogInput
): {
  catalog: TvEventCatalog | null;
  catalogEventId: string;
  catalogLoading: boolean;
} {
  const trimmed = input.eventId?.trim() ?? "";
  const initialEventId = input.initial?.eventId?.trim() ?? "";

  if (!trimmed) {
    if (input.allowPendingInitial) {
      const fromPending = catalogFromPendingInitial(input.initial);
      if (fromPending && initialEventId) {
        return {
          catalog: fromPending,
          catalogEventId: initialEventId,
          catalogLoading: false,
        };
      }
    }
    return { catalog: null, catalogEventId: "", catalogLoading: false };
  }

  if (initialEventId && trimmed === initialEventId) {
    const fromInitial = catalogFromMatchingInitial(trimmed, input.initial);
    if (fromInitial) {
      return {
        catalog: fromInitial,
        catalogEventId: trimmed,
        catalogLoading: false,
      };
    }
  }

  if (input.storedEventId === trimmed && input.stored) {
    return {
      catalog: input.stored,
      catalogEventId: trimmed,
      catalogLoading: false,
    };
  }

  const cached = getCachedTvEventCatalog(trimmed);
  if (cached) {
    return {
      catalog: cached,
      catalogEventId: trimmed,
      catalogLoading: false,
    };
  }

  return { catalog: null, catalogEventId: trimmed, catalogLoading: true };
}

/** Pure initial state for tests and hydration (same event id only). */
export function resolveTvEventCatalogInitialState(
  eventId: string,
  initial?: TvEventTipCatalogInitial | null,
  opts?: { allowPendingInitial?: boolean }
): { catalog: TvEventCatalog | null; catalogLoading: boolean } {
  const displayed = resolveDisplayedTvEventCatalog({
    eventId,
    stored: null,
    storedEventId: null,
    initial,
    allowPendingInitial: opts?.allowPendingInitial ?? true,
  });
  return {
    catalog: displayed.catalog,
    catalogLoading: displayed.catalogLoading,
  };
}

/**
 * Per-event tip catalog for TV/explore playback surfaces.
 * Never falls back to the platform-wide character pool — wrong pool caused
 * tip strips to show characters outside the video's assigned drawer.
 */
export function useTvEventTipCatalog(
  eventId: string,
  opts?: {
    initial?: TvEventTipCatalogInitial | null;
    allowPendingInitial?: boolean;
  }
): {
  catalog: TvEventCatalog | null;
  catalogEventId: string;
  tippingCharacters: RoomCharacter[];
  characterSets: TvEventCatalog["characterSets"];
  catalogLoading: boolean;
} {
  const initial = opts?.initial;
  const allowPendingInitial = opts?.allowPendingInitial ?? false;

  const [storedCatalog, setStoredCatalog] = useState<TvEventCatalog | null>(
    () =>
      resolveTvEventCatalogInitialState(eventId, initial, {
        allowPendingInitial,
      }).catalog
  );
  const [storedEventId, setStoredEventId] = useState<string | null>(() => {
    const displayed = resolveDisplayedTvEventCatalog({
      eventId,
      stored: null,
      storedEventId: null,
      initial,
      allowPendingInitial,
    });
    return displayed.catalogEventId || null;
  });
  const [fetchLoading, setFetchLoading] = useState(
    () =>
      resolveTvEventCatalogInitialState(eventId, initial, {
        allowPendingInitial,
      }).catalogLoading
  );

  useEffect(() => {
    if (!eventId?.trim()) {
      if (allowPendingInitial) {
        const fromPending = catalogFromPendingInitial(initial);
        if (fromPending && initial?.eventId?.trim()) {
          const owner = initial.eventId.trim();
          setStoredCatalog(fromPending);
          setStoredEventId(owner);
          setFetchLoading(false);
          primeTvEventCatalog(owner, fromPending.characterSets);
        } else {
          setStoredCatalog(null);
          setStoredEventId(null);
          setFetchLoading(false);
        }
      } else {
        setStoredCatalog(null);
        setStoredEventId(null);
        setFetchLoading(false);
      }
      return;
    }

    const trimmed = eventId.trim();
    const fromInitial = catalogFromMatchingInitial(trimmed, initial);

    const applyCacheHit = () => {
      const cached = getCachedTvEventCatalog(trimmed);
      if (cached) {
        setStoredCatalog(cached);
        setStoredEventId(trimmed);
        setFetchLoading(false);
        return true;
      }
      return false;
    };

    if (fromInitial) {
      setStoredCatalog(fromInitial);
      setStoredEventId(trimmed);
      setFetchLoading(false);
      primeTvEventCatalog(trimmed, fromInitial.characterSets);
    } else if (!applyCacheHit()) {
      setStoredCatalog(null);
      setStoredEventId(null);
      setFetchLoading(true);
    }

    const unsubscribe = subscribeTvEventCatalog(() => {
      applyCacheHit();
    });

    let cancelled = false;
    void loadTvEventCatalog(trimmed).then(next => {
      if (cancelled) return;
      if (next) {
        setStoredCatalog(next);
        setStoredEventId(trimmed);
        setFetchLoading(false);
      } else {
        setFetchLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [
    eventId,
    initial?.eventId,
    initial?.characterSets,
    initial?.characters,
    allowPendingInitial,
  ]);

  const displayed = useMemo(
    () =>
      resolveDisplayedTvEventCatalog({
        eventId,
        stored: storedCatalog,
        storedEventId,
        initial,
        allowPendingInitial,
      }),
    [eventId, storedCatalog, storedEventId, initial, allowPendingInitial]
  );

  const catalogLoading =
    displayed.catalogLoading || (displayed.catalog == null && fetchLoading);

  const tippingCharacters = useMemo(
    () => (displayed.catalog?.characters ?? []) as RoomCharacter[],
    [displayed.catalog?.characters]
  );

  const characterSets = useMemo(
    () =>
      (displayed.catalog?.characterSets ?? []).filter(
        set => Array.isArray(set.characters) && set.characters.length > 0
      ),
    [displayed.catalog?.characterSets]
  );

  return {
    catalog: displayed.catalog,
    catalogEventId: displayed.catalogEventId,
    tippingCharacters,
    characterSets,
    catalogLoading,
  };
}
