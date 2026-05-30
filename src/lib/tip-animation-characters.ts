import type { TipAnimationEvent } from "@/lib/animation-guard";
import type { RoomCharacter } from "@/types";
import {
  isKnownAnimationStyleName,
  type StyleCharacter,
} from "@/lib/animation-style-registry";

/**
 * Prefer server `resolvedTips`; fall back to event character map (same as pre-enrichment behavior).
 */
export function resolveStyleCharactersForTip(
  data: TipAnimationEvent,
  characterMap: Map<string, RoomCharacter>
): StyleCharacter[] {
  const fromMap = (): StyleCharacter[] =>
    (data.selectedTips || [])
      .map(name => characterMap.get(name))
      .filter((c): c is RoomCharacter => Boolean(c))
      .map(c => ({
        name: c.name,
        iconUrl: c.iconUrl,
        styleName: c.styleName,
      }));

  if (!data.resolvedTips?.length) return fromMap();

  const fromResolved: StyleCharacter[] = [];
  for (const r of data.resolvedTips) {
    if (!r.styleName || !isKnownAnimationStyleName(r.styleName)) {
      return fromMap();
    }
    const iconUrl = r.iconUrl || characterMap.get(r.name)?.iconUrl || "";
    if (!iconUrl && r.styleName !== "Confetti") {
      return fromMap();
    }
    fromResolved.push({
      name: r.name,
      iconUrl,
      styleName: r.styleName,
    });
  }

  if (fromResolved.length !== (data.selectedTips?.length ?? 0)) {
    return fromMap();
  }
  return fromResolved;
}
