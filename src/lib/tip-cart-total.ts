import type { RoomCharacter } from "@/types";

const DEFAULT_TEXT_TIP_UNIT_GBP = 5;
/** Stripe minimum for GBP payment mode (pence). Used only when cart is empty. */
export const STRIPE_EMPTY_CART_PLACEHOLDER_MINOR = 100;

export function computeTipCartTotal(
  selectedTips: string[],
  catalog: Array<{ name: string; price?: number | null }>,
  textTipUnitPrice: number = DEFAULT_TEXT_TIP_UNIT_GBP
): number {
  if (!selectedTips?.length) return 0;

  const byName = new Map<string, number>();
  for (const c of catalog) {
    if (c?.name) byName.set(c.name, Number(c.price) || 0);
  }

  const textUnit =
    Number.isFinite(textTipUnitPrice) && textTipUnitPrice > 0
      ? textTipUnitPrice
      : DEFAULT_TEXT_TIP_UNIT_GBP;

  return selectedTips.reduce((acc, characterName) => {
    if (characterName === "Comment") return acc + textUnit;
    return acc + (byName.get(characterName) ?? 0);
  }, 0);
}

/** GBP total → Stripe minor units (pence). */
export function toMinorUnits(totalGbp: number): number {
  return Math.round(totalGbp * 100);
}

/**
 * Amount for Stripe Elements `mode: "payment"`.
 * Uses exact cart total when non-empty; placeholder when empty (pay disabled).
 */
export function stripeElementsAmountMinor(
  totalGbp: number,
  placeholderMinor: number = STRIPE_EMPTY_CART_PLACEHOLDER_MINOR
): number {
  if (totalGbp > 0) return toMinorUnits(totalGbp);
  return placeholderMinor;
}
