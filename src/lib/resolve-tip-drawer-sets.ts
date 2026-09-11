import { isTextTipCharacterRef } from "@/lib/tip-text-selection";
import type { RoomCharacter } from "@/types";

export type CharacterSetLike = {
  id?: string;
  name?: string;
  characters?: RoomCharacter[];
};

export function isEliteCharacterSetName(name: string | undefined): boolean {
  return Boolean(name?.trim().toLowerCase().includes("elite"));
}

/** Elite assigned set first, then General, then stable original order. */
export function sortDrawerCharacterSets<T extends CharacterSetLike>(
  sets: T[]
): T[] {
  return [...sets].sort((a, b) => {
    const aElite = isEliteCharacterSetName(a.name);
    const bElite = isEliteCharacterSetName(b.name);
    if (aElite && !bElite) return -1;
    if (!aElite && bElite) return 1;
    if (a.name === "General") return -1;
    if (b.name === "General") return 1;
    return 0;
  });
}

export function mergeCharacterPools(
  ...pools: RoomCharacter[][]
): RoomCharacter[] {
  const byId = new Map<string, RoomCharacter>();
  for (const pool of pools) {
    for (const character of pool) {
      byId.set(character.id, character);
    }
  }
  return [...byId.values()];
}

/** Keep SSR strip order/ids; overlay live prices from the enriched catalog. */
export function overlayStripPrices(
  stripChars: RoomCharacter[],
  priceCatalog?: RoomCharacter[] | null
): RoomCharacter[] {
  const priceById = new Map((priceCatalog ?? []).map(c => [c.id, c]));
  return stripChars.map(character =>
    overlayCharacterPrice(character, priceById)
  );
}

function overlayCharacterPrice(
  character: RoomCharacter,
  priceById: Map<string, RoomCharacter>
): RoomCharacter {
  const enriched = priceById.get(character.id);
  if (!enriched) return character;
  return {
    ...character,
    ...enriched,
    iconUrl: character.iconUrl || enriched.iconUrl,
    styleName: character.styleName || enriched.styleName,
    name: character.name || enriched.name,
  };
}

/**
 * Build drawer tabs from assigned event character sets.
 * Live tip layout overlays prices from `priceCatalog` only — never flattens into synthetic Tips/Elite tabs.
 */
export function resolveTipDrawerSets<T extends CharacterSetLike>(
  catalogSets: T[] | null | undefined,
  priceCatalog?: RoomCharacter[] | null,
  fallbackSets?: T[] | null
): T[] {
  const base =
    Array.isArray(catalogSets) && catalogSets.length > 0
      ? catalogSets
      : Array.isArray(fallbackSets)
        ? fallbackSets
        : [];

  const priceById = new Map((priceCatalog ?? []).map(c => [c.id, c]));

  const withOverlay = base
    .map(set => {
      const characters = (set.characters ?? [])
        .filter(c => !isTextTipCharacterRef(c))
        .map(c => overlayCharacterPrice(c, priceById));
      return { ...set, characters };
    })
    .filter(set => set.characters.length > 0);

  return sortDrawerCharacterSets(withOverlay);
}

/** Single-set fallback when assigned event catalog sets are unavailable (studio / pre-hydrate). */
export function buildFallbackDrawerSetsFromCharacters(
  characters: RoomCharacter[]
): CharacterSetLike[] {
  const rows = characters.filter(c => !isTextTipCharacterRef(c));
  if (rows.length === 0) return [];
  return [
    {
      id: "tip-drawer-fallback",
      name: "Tips",
      characters: rows,
    },
  ];
}

/** @deprecated Live layout no longer emits synthetic drawer tabs. */
export function drawerSetsHaveCharacters(
  drawerSets: { characters?: unknown[] }[] | null | undefined
): boolean {
  return Boolean(
    drawerSets?.some(
      set => Array.isArray(set.characters) && set.characters.length > 0
    )
  );
}
