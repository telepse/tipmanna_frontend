import type { RoomCharacter } from "@/types";
import { mergeTipPriceCatalog } from "@/lib/tip-text-selection";

type CharacterSetLike = { characters?: RoomCharacter[] };

/**
 * Merge enriched host tip config prices with per-video catalog for Stripe totals.
 * Enriched catalog (tipPres.catalog) wins on id collision; fallbacks cover loading races.
 */
export function buildSurfaceTipPriceCatalog(options: {
  enrichedCatalog: RoomCharacter[];
  videoCatalog?: RoomCharacter[];
  fallbackCatalog?: RoomCharacter[];
  characterSets?: CharacterSetLike[];
}): RoomCharacter[] {
  const video = options.videoCatalog?.length ? options.videoCatalog : undefined;
  const fallback = options.fallbackCatalog?.length
    ? options.fallbackCatalog
    : undefined;
  const setChars = (options.characterSets ?? []).flatMap(
    set => set.characters ?? []
  );

  return mergeTipPriceCatalog(
    options.enrichedCatalog,
    video,
    fallback,
    setChars
  );
}
