import type { TipPresentation } from "@/lib/merge-tip-config";

export function drawerSetsHaveCharacters(
  drawerSets: TipPresentation["drawerSets"] | null | undefined
): boolean {
  return Boolean(
    drawerSets?.some(
      set => Array.isArray(set.characters) && set.characters.length > 0
    )
  );
}

export function resolveTipDrawerSets<T extends { characters?: unknown[] }>(
  drawerSets: TipPresentation["drawerSets"] | null | undefined,
  fallbackSets: T[]
): T[] {
  if (drawerSetsHaveCharacters(drawerSets)) {
    return drawerSets as unknown as T[];
  }

  return (Array.isArray(fallbackSets) ? fallbackSets : []).filter(
    set => Array.isArray(set.characters) && set.characters.length > 0
  );
}
