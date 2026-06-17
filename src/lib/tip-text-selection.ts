/** Payload for {@link notifyTextTipDraftSync} (optional). */
export type TextTipDraftSyncDetail = Record<string, unknown>;

/** Same-tab listeners sync draft UI when localStorage `textTipValue` changes. */
export function notifyTextTipDraftSync(detail?: TextTipDraftSyncDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tip:text-draft-sync", { detail: detail ?? {} })
  );
}

/**
 * Env id for the synthetic “Text” / comment-line character (client bundles).
 */
export function textCharacterIdFromEnv(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_TEXT_CHARACTER_ID ??
    process.env.NEXT_TEXT_CHARACTER_ID;
  if (raw == null || String(raw).trim() === "") return undefined;
  return String(raw).trim();
}

/** UUID-safe match between API character id and env. */
export function isTextCharacterId(characterId: unknown): boolean {
  const env = textCharacterIdFromEnv();
  if (!env || characterId == null) return false;
  return String(characterId).trim() === env;
}

/** Cart uses "Comment"; catalog often uses "Add Comment". */
export function isTextTipCharacterName(name: string): boolean {
  const normalized = name.trim();
  return normalized === "Comment" || normalized === "Add Comment";
}

/** Resolve the paid-comment character for preview animations. */
export function resolveCommentPreviewCharacter(
  catalog?: Array<{
    id: string;
    name: string;
    iconUrl?: string | null;
    styleName?: string | null;
  }>
): { name: string; iconUrl: string; styleName: string } | null {
  if (!catalog?.length) return null;

  const match =
    catalog.find(c => isTextCharacterId(c.id)) ??
    catalog.find(c => isTextTipCharacterName(c.name));
  if (!match?.iconUrl?.trim()) return null;

  return {
    name: match.name,
    iconUrl: match.iconUrl.trim(),
    styleName: match.styleName?.trim() || "Screen Shake",
  };
}

/**
 * At most one `"Comment"` entry (other tip names may repeat for quantity).
 */
export function ensureSingleTextInCart(names: string[]): string[] {
  let seenText = false;
  const out: string[] = [];
  for (const n of names) {
    if (n === "Comment") {
      if (!seenText) {
        out.push("Comment");
        seenText = true;
      }
    } else {
      out.push(n);
    }
  }
  return out;
}

/** Clear local text-tip draft storage and notify same-tab listeners. */
export function clearTextTipDraftStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("textTipValue");
  } catch {
    /* quota / private mode */
  }
  notifyTextTipDraftSync();
}

/** Cart label for a tipping character (text env id maps to "Comment"). */
export function tipCartNameForCharacter(character: {
  id: string;
  name: string;
}): string {
  return isTextCharacterId(character.id) ? "Comment" : character.name;
}

/** Unit price for the text / paid-comment character. */
export function resolveTextTipUnitPrice(
  catalog: Array<{ id: string; price?: number | null }>,
  fallback = 5
): number {
  const textChar = catalog.find(c => isTextCharacterId(c.id));
  const price = textChar?.price;
  return typeof price === "number" && Number.isFinite(price) && price > 0
    ? price
    : fallback;
}

/** Sum cart line prices (Comment counts once; other names may repeat for quantity). */
export function sumSelectedTipCartTotal(
  cartNames: string[],
  catalog: Array<{ id: string; name: string; price?: number | null }>,
  textUnitPrice?: number
): number {
  const normalized = ensureSingleTextInCart(cartNames);
  const unit = textUnitPrice ?? resolveTextTipUnitPrice(catalog);
  const byName = new Map(catalog.map(c => [c.name, c]));

  return normalized.reduce((acc, characterName) => {
    if (characterName === "Comment") {
      return acc + unit;
    }
    const character = byName.get(characterName);
    return acc + (character?.price ?? 0);
  }, 0);
}

/** Merge character lists for cart price lookup (first source wins per id). */
export function mergeTipPriceCatalog<
  T extends { id: string; name: string; price?: number | null },
>(...sources: Array<T[] | undefined>): T[] {
  const byId = new Map<string, T>();
  for (const source of sources) {
    for (const character of source ?? []) {
      if (character?.id && !byId.has(character.id)) {
        byId.set(character.id, character);
      }
    }
  }
  return [...byId.values()];
}

/**
 * Tip section strip: Comment/text first, no duplicate comment rows.
 */
export function buildTipSectionPreviewCharacters<
  T extends { id: string; name: string },
>(tippingCharacters: T[]): T[] {
  const tid = textCharacterIdFromEnv();
  const restById = new Map<string, T>();
  let commentChar: T | undefined;

  for (const character of tippingCharacters) {
    if (tid && isTextCharacterId(character.id)) {
      commentChar = character;
      continue;
    }
    if (character.name === "Comment") {
      if (tid) continue;
      if (!commentChar) commentChar = character;
      continue;
    }
    if (!restById.has(character.id)) {
      restById.set(character.id, character);
    }
  }

  const rest = [...restById.values()];
  return commentChar ? [commentChar, ...rest] : rest;
}
