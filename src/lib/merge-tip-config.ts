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

/**
 * Apply published tip config ordering/prices to catalog characters for strip + drawer.
 */
export function buildTipPresentation(
  baseCharacters: RoomCharacter[],
  payload: TipConfigPayload,
  configVersion: number
): TipPresentation {
  const baseById = new Map(baseCharacters.map(c => [c.id, c]));
  const textId = textCharacterIdFromEnv();
  const textFromCatalog =
    (textId ? baseById.get(textId) : null) ||
    baseCharacters.find(c => isTextCharacterId(c.id)) ||
    null;

  const textUnitPrice = payload.textCharacter.priceMinor / 100;
  const sectionStrip: EnrichedRoomCharacter[] = [];

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

  for (const it of byPosition(payload.sectionItems)) {
    const row = enrichItem(it, baseById);
    if (row) sectionStrip.push(row);
  }

  const drawerChars: EnrichedRoomCharacter[] = [];
  for (const it of byPosition(payload.drawerItems)) {
    const row = enrichItem(it, baseById);
    if (row) drawerChars.push(row);
  }

  const byId = new Map<string, EnrichedRoomCharacter>();
  for (const c of sectionStrip) byId.set(c.id, c);
  for (const c of drawerChars) byId.set(c.id, c);
  const allEnriched = [...byId.values()];

  return {
    sectionStrip,
    drawerSets: [
      {
        id: "tip-config-drawer",
        name: "Tips",
        characters: drawerChars,
      },
    ],
    allEnriched,
    ctaSectionLabel: payload.ctaSectionLabel,
    ctaPayLabel: payload.ctaPayLabel,
    textUnitPrice,
    configVersion,
  };
}
