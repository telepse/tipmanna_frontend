"use client";

import { useEffect, useState } from "react";
import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import type { RoomCharacter } from "@/types";

import { isTvLazySsrCharactersEnabled } from "@/lib/tv-feature-flags";

type CharacterLike = RoomCharacter & { iconUrl?: string; price?: number };

/**
 * Client fetch for tipping characters when SSR lazy flag is on.
 * Keeps payment animation characterMap populated after idle/first paint.
 */
export function useTvLazyCharacters(initialCharacters: CharacterLike[]): {
  characters: CharacterLike[];
  loading: boolean;
} {
  const lazyEnabled = isTvLazySsrCharactersEnabled();
  const [characters, setCharacters] = useState<CharacterLike[]>(
    lazyEnabled ? [] : initialCharacters
  );
  const [loading, setLoading] = useState(
    lazyEnabled && initialCharacters.length === 0
  );

  useEffect(() => {
    if (!lazyEnabled) {
      setCharacters(initialCharacters);
      setLoading(false);
      return;
    }
    if (initialCharacters.length > 0) {
      setCharacters(initialCharacters);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = () => {
      void (async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [{ data: chars }, { data: _sets }] = await Promise.all([
          getCharactersForTipping(),
          getAllCharacterSets(),
        ]);
        if (cancelled) return;
        setCharacters((chars ?? []) as CharacterLike[]);
        setLoading(false);
      })();
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => run(), { timeout: 3000 });
    } else {
      window.setTimeout(run, 500);
    }

    return () => {
      cancelled = true;
    };
  }, [lazyEnabled, initialCharacters]);

  return { characters, loading };
}
