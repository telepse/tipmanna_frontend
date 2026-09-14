import {
  buildTipSectionPreviewCharacters,
  isTextTipCharacterRef,
} from "@/lib/tip-text-selection";
import type { RoomCharacter } from "@/types";

const STRIP_MAX = 20;

function shuffleInPlace<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i];
    const swap = copy[j];
    if (current === undefined || swap === undefined) continue;
    copy[i] = swap;
    copy[j] = current;
  }
  return copy;
}

export type ShuffleTipStripOptions = {
  /** Keep host section order (live tip layout). Pin comment first, cap at maxStrip. */
  preserveHostOrder?: boolean;
  maxStrip?: number;
};

/** Pin comment first, prefer elite ids, then random fill to maxStrip. */
export function shuffleTipStrip<T extends RoomCharacter>(
  tippingCharacters: T[],
  eliteCharacterIds?: string[],
  maxStripOrOptions: number | ShuffleTipStripOptions = STRIP_MAX
): T[] {
  const options: ShuffleTipStripOptions =
    typeof maxStripOrOptions === "number"
      ? { maxStrip: maxStripOrOptions }
      : maxStripOrOptions;
  const maxStrip = options.maxStrip ?? STRIP_MAX;
  const ordered = buildTipSectionPreviewCharacters(tippingCharacters);
  const comment = ordered.find(isTextTipCharacterRef);
  const rest = ordered.filter(c => !isTextTipCharacterRef(c));

  if (options.preserveHostOrder) {
    const merged = comment ? [comment, ...rest] : rest;
    return merged.slice(0, maxStrip);
  }

  const eliteSet = new Set(eliteCharacterIds ?? []);
  const elite = rest.filter(c => eliteSet.has(c.id));
  const nonElite = rest.filter(c => !eliteSet.has(c.id));
  const pool = [...shuffleInPlace(elite), ...shuffleInPlace(nonElite)];
  const picked = pool.slice(0, maxStrip - (comment ? 1 : 0));
  return comment ? [comment, ...picked] : picked;
}
