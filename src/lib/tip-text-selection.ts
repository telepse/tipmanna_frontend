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

/**
 * At most one `"Text"` entry (other tip names may repeat for quantity).
 */
export function ensureSingleTextInCart(names: string[]): string[] {
  let seenText = false;
  const out: string[] = [];
  for (const n of names) {
    if (n === "Text") {
      if (!seenText) {
        out.push("Text");
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
