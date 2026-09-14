import type { RoomCharacter } from "@/types";
import type { TipConfigPayload } from "@/lib/tip-config-types";
import {
  textCharacterIdFromEnv,
  isTextCharacterId,
} from "@/lib/tip-text-selection";

export type EnrichedRoomCharacter = RoomCharacter & {
  tipItemId: string;
  tipKind: "default" | "premium";
  /** Short label for UI when host set labelOverride (cart still uses `name`). */
  displayLabel?: string;
};

export type TipPresentation = {
  sectionStrip: EnrichedRoomCharacter[];
  drawerSets: {
    id: string;
    name: string;
    characters: EnrichedRoomCharacter[];
  }[];
  allEnriched: EnrichedRoomCharacter[];
  ctaSectionLabel: string;
  ctaPayLabel: string;
  textUnitPrice: number;
  configVersion: number;
};

function byPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

function enrichItem(
  item: TipConfigPayload["sectionItems"][number],
  baseById: Map<string, RoomCharacter>
): EnrichedRoomCharacter | null {
  const base = baseById.get(item.characterId);
  if (!base) return null;
  const price = item.priceMinor / 100;
  return {
    ...base,
    price,
    tipItemId: item.itemId,
    tipKind: item.kind,
    name: base.name,
    displayLabel: item.labelOverride?.trim() || base.name,
  };
}

function mergeEliteStubsIntoBase(
  baseCharacters: RoomCharacter[],
  eliteStubs: RoomCharacter[],
  eliteCharacterIds?: string[]
): RoomCharacter[] {
  const eliteIds = new Set(eliteCharacterIds ?? []);
  if (eliteIds.size === 0) return baseCharacters;
  const byId = new Map(baseCharacters.map(c => [c.id, c]));
  for (const stub of eliteStubs) {
    if (eliteIds.has(stub.id)) byId.set(stub.id, stub);
  }
  return [...byId.values()];
}

function injectEliteIntoDrawerItems(
  payload: TipConfigPayload,
  baseById: Map<string, RoomCharacter>
): TipConfigPayload {
  const eliteIds = payload.eliteCharacterIds ?? [];
  if (eliteIds.length === 0) return payload;
  const drawerItems = [...payload.drawerItems];
  for (const id of eliteIds) {
    if (drawerItems.some(it => it.characterId === id)) continue;
    const base = baseById.get(id);
    if (!base) continue;
    drawerItems.push({
      itemId: `elite-inject-${id}`,
      kind: "default",
      characterId: id,
      priceMinor: Math.round(Number(base.price) * 100),
      position: drawerItems.length + 1,
    });
  }
  return { ...payload, drawerItems };
}

/**
 * Apply published tip config ordering/prices to catalog characters for strip + drawer.
 */
export function buildTipPresentation(
  baseCharacters: RoomCharacter[],
  payload: TipConfigPayload,
  configVersion: number,
  eliteStubs: RoomCharacter[] = []
): TipPresentation {
  const mergedBase = mergeEliteStubsIntoBase(
    baseCharacters,
    eliteStubs,
    payload.eliteCharacterIds
  );
  const baseById = new Map(mergedBase.map(c => [c.id, c]));
  const payloadWithElite = injectEliteIntoDrawerItems(payload, baseById);
  const textId = textCharacterIdFromEnv();
  const textFromCatalog =
    (textId ? baseById.get(textId) : null) ||
    baseCharacters.find(c => isTextCharacterId(c.id)) ||
    null;

  const textUnitPrice = payload.textCharacter.priceMinor / 100;
  const sectionStrip: EnrichedRoomCharacter[] = [];
  const STRIP_MAX = 20;

  if (payload.textCharacter.enabled) {
    if (textFromCatalog) {
      sectionStrip.push({
        ...textFromCatalog,
        price: textUnitPrice,
        tipItemId: "__text__",
        tipKind: "default",
        displayLabel: textFromCatalog.name,
      });
    }
  }

  const sectionItemIds = new Set(
    payloadWithElite.sectionItems.map(it => it.characterId)
  );
  for (const eliteId of payloadWithElite.eliteCharacterIds ?? []) {
    if (sectionStrip.length >= STRIP_MAX) break;
    if (sectionItemIds.has(eliteId)) continue;
    const base = baseById.get(eliteId);
    if (!base || sectionStrip.some(c => c.id === eliteId)) continue;
    sectionStrip.push({
      ...base,
      tipItemId: `elite-strip-${eliteId}`,
      tipKind: "default",
      displayLabel: base.name,
    });
  }

  for (const it of byPosition(payloadWithElite.sectionItems)) {
    if (sectionStrip.length >= STRIP_MAX) break;
    const row = enrichItem(it, baseById);
    if (row) sectionStrip.push(row);
  }

  const drawerChars: EnrichedRoomCharacter[] = [];
  for (const it of byPosition(payloadWithElite.drawerItems)) {
    const row = enrichItem(it, baseById);
    if (row) drawerChars.push(row);
  }

  const byId = new Map<string, EnrichedRoomCharacter>();
  for (const c of sectionStrip) byId.set(c.id, c);
  for (const c of drawerChars) byId.set(c.id, c);
  const allEnriched = [...byId.values()];

  return {
    sectionStrip,
    drawerSets: [],
    allEnriched,
    ctaSectionLabel: payloadWithElite.ctaSectionLabel,
    ctaPayLabel: payloadWithElite.ctaPayLabel,
    textUnitPrice,
    configVersion,
  };
}
