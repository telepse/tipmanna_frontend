import type { RoomCharacter } from "@/types";

export type EventCharacterSet = {
  id: string;
  name: string;
  characters: RoomCharacter[];
};

export function parseEventCharacterCatalog(rawSets: unknown): {
  characterSets: EventCharacterSet[];
  tippingCharacters: RoomCharacter[];
} {
  const sets = Array.isArray(rawSets) ? rawSets : [];
  const characterSets = sets.filter((s): s is EventCharacterSet =>
    Boolean(
      s &&
        typeof s === "object" &&
        "id" in s &&
        Array.isArray((s as EventCharacterSet).characters) &&
        (s as EventCharacterSet).characters.length > 0
    )
  );

  const tippingCharacters = characterSets.flatMap(set =>
    set.characters.map(char => ({
      id: char.id,
      name: char.name,
      iconUrl: char.iconUrl,
      price: char.price,
      styleName: char.styleName?.trim() || "Confetti",
      type: (char as { type?: string | null }).type,
    }))
  );

  return { characterSets, tippingCharacters };
}
