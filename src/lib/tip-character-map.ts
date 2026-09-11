import type { AnimationLibraryItem } from "@/actions/tip-config";
import type { RoomCharacter } from "@/types";

export type TipCharacterRef = {
  id: string;
  name: string;
  iconUrl: string;
  price: number;
  styleName?: string;
  type?: string;
};

/** Build lookup map from animation library rows and optional event catalog. */
export function buildTipCharacterMap(
  libraryItems: TipCharacterRef[],
  catalogCharacters: RoomCharacter[] = []
): Map<string, TipCharacterRef> {
  const map = new Map<string, TipCharacterRef>();
  for (const c of catalogCharacters) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      iconUrl: c.iconUrl,
      price: c.price,
      styleName: c.styleName?.trim() || "Confetti",
      type: (c as { type?: string }).type,
    });
  }
  for (const item of libraryItems) {
    map.set(item.id, {
      id: item.id,
      name: item.name,
      iconUrl: item.iconUrl,
      price: item.price,
      styleName: item.styleName ?? undefined,
      type: item.type,
    });
  }
  return map;
}

export function libraryItemsToRoomCharacters(
  items: AnimationLibraryItem[]
): RoomCharacter[] {
  return items.map(item => ({
    id: item.id,
    name: item.name,
    iconUrl: item.iconUrl,
    price: item.price,
    styleName: item.styleName?.trim() || "Confetti",
  }));
}

export function resolveCharacterFromMap(
  map: Map<string, TipCharacterRef>,
  characterId: string,
  priceMinor?: number
): RoomCharacter | null {
  const row = map.get(characterId);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    iconUrl: row.iconUrl,
    price: priceMinor != null ? priceMinor / 100 : row.price,
    styleName: row.styleName?.trim() || "Confetti",
  };
}
