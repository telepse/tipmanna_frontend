import { isTextTipCharacterRef } from "@/lib/tip-text-selection";
import type { RoomCharacter } from "@/types";

export type CharacterSetLike = {
  id?: string;
  name?: string;
  characters?: RoomCharacter[];
};

export const PUBLIC_STRIP_POOL_MAX = 20;

export function isEliteCharacterSetName(name: string | undefined): boolean {
  return Boolean(name?.trim().toLowerCase().includes("elite"));
}

function drawerSetSortRank(name: string | undefined): number {
  if (isEliteCharacterSetName(name)) return 0;
  if (name === "General") return 1;
  if (name === "Premium") return 2;
  return 3;
}

/** Elite assigned set first, then General, then Premium, then stable original order. */
export function sortDrawerCharacterSets<T extends CharacterSetLike>(
  sets: T[]
): T[] {
  return [...sets].sort((a, b) => {
    const rankDiff = drawerSetSortRank(a.name) - drawerSetSortRank(b.name);
    if (rankDiff !== 0) return rankDiff;
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

function findCommentCharacter(
  priceCatalog?: RoomCharacter[] | null,
  ...setPools: (CharacterSetLike[] | null | undefined)[]
): RoomCharacter | null {
  const fromCatalog = (priceCatalog ?? []).find(isTextTipCharacterRef);
  if (fromCatalog) return fromCatalog;
  for (const pool of setPools) {
    for (const set of pool ?? []) {
      const found = (set.characters ?? []).find(isTextTipCharacterRef);
      if (found) return found;
    }
  }
  return null;
}

/** Pin comment as the first icon on every drawer tab (deduped within each tab). */
export function pinCommentFirstOnDrawerSets<T extends CharacterSetLike>(
  sets: T[],
  comment?: RoomCharacter | null
): T[] {
  if (!comment || !isTextTipCharacterRef(comment)) return sets;
  return sets.map(set => {
    const rest = (set.characters ?? []).filter(c => c.id !== comment.id);
    return { ...set, characters: [comment, ...rest] };
  });
}

/** Flatten drawer tab characters for the public tip-section shuffle pool. */
export function drawerCharactersForStrip(
  sets: CharacterSetLike[],
  comment?: RoomCharacter | null
): RoomCharacter[] {
  const byId = new Map<string, RoomCharacter>();
  for (const set of sets) {
    for (const character of set.characters ?? []) {
      if (!byId.has(character.id)) byId.set(character.id, character);
    }
  }
  const pool = [...byId.values()];
  if (comment && !byId.has(comment.id)) {
    return [comment, ...pool];
  }
  return pool;
}

/** Synthetic Elite tab from published eliteCharacterIds when no assigned Elite set exists. */
export function buildPublishedEliteDrawerSet<T extends CharacterSetLike>(
  eliteCharacterIds: string[] | undefined,
  priceCatalog?: RoomCharacter[] | null
): T | null {
  const ids = (eliteCharacterIds ?? []).filter(Boolean);
  if (ids.length === 0) return null;

  const priceById = new Map((priceCatalog ?? []).map(c => [c.id, c]));
  const characters = ids
    .map(id => priceById.get(id))
    .filter((c): c is RoomCharacter => Boolean(c))
    .filter(c => !isTextTipCharacterRef(c))
    .map(c => overlayCharacterPrice(c, priceById));

  if (characters.length === 0) return null;

  return {
    id: "tip-drawer-published-elite",
    name: "Elite",
    characters,
  } as T;
}

/**
 * Public strip shuffle pool: comment, published elite ids, drawer-set characters,
 * then remaining catalog rows so shuffle can always fill 20 when published pool allows.
 */
export function buildPublicTipStripPool(
  drawerSets: CharacterSetLike[],
  priceCatalog?: RoomCharacter[] | null,
  eliteCharacterIds?: string[] | null,
  comment?: RoomCharacter | null
): RoomCharacter[] {
  const priceById = new Map((priceCatalog ?? []).map(c => [c.id, c]));
  const seen = new Set<string>();
  const pool: RoomCharacter[] = [];

  const push = (character: RoomCharacter | null | undefined) => {
    if (!character || seen.has(character.id)) return;
    seen.add(character.id);
    pool.push(overlayCharacterPrice(character, priceById));
  };

  const commentChar =
    comment ?? findCommentCharacter(priceCatalog, drawerSets) ?? null;
  if (commentChar) push(commentChar);

  for (const id of eliteCharacterIds ?? []) {
    push(priceById.get(id));
  }

  for (const set of drawerSets) {
    for (const character of set.characters ?? []) {
      push(character);
    }
  }

  for (const character of priceCatalog ?? []) {
    push(character);
  }

  return pool;
}

/**
 * Build drawer tabs from assigned event character sets.
 * Live tip layout overlays published prices from `priceCatalog` only — never flattens into synthetic Tips/Elite tabs.
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

export function resolveTipDrawerPresentation<T extends CharacterSetLike>(
  catalogSets: T[] | null | undefined,
  priceCatalog?: RoomCharacter[] | null,
  fallbackSets?: T[] | null,
  eliteCharacterIds?: string[] | null
): { drawerSets: T[]; stripPool: RoomCharacter[] } {
  const comment = findCommentCharacter(priceCatalog, catalogSets, fallbackSets);
  let drawerSets = pinCommentFirstOnDrawerSets(
    resolveTipDrawerSets(catalogSets, priceCatalog, fallbackSets),
    comment
  );

  const hasAssignedEliteTab = drawerSets.some(s =>
    isEliteCharacterSetName(s.name)
  );
  if (!hasAssignedEliteTab && (eliteCharacterIds?.length ?? 0) > 0) {
    const synthetic = buildPublishedEliteDrawerSet<T>(
      eliteCharacterIds ?? undefined,
      priceCatalog
    );
    if (synthetic) {
      drawerSets = [
        ...pinCommentFirstOnDrawerSets([synthetic], comment),
        ...drawerSets,
      ];
    }
  }

  return {
    drawerSets,
    stripPool: buildPublicTipStripPool(
      drawerSets,
      priceCatalog,
      eliteCharacterIds,
      comment
    ),
  };
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
