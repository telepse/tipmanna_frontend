/** Mirror backend tip-reward-flags.util.ts for preview UI. */
export const GALAXY_MIN_AMOUNT_GBP = 50;
export const TURBO_MIN_DISTINCT_STYLES = 3;
export const GALAXY_ICON_COUNT = 1;

export type TipRewardEligibility = {
  rewardTurbo: boolean;
  rewardGalaxy: boolean;
  distinctStyleCount: number;
  totalGbp: number;
};

function isTextTipName(name: string): boolean {
  const n = name.trim();
  return n === "Comment" || n === "Add Text" || n === "Comment";
}

function resolveCharacter(
  name: string,
  characters: {
    name: string;
    price: number;
    styleName?: string | null;
  }[]
) {
  if (isTextTipName(name)) {
    return (
      characters.find(c => isTextTipName(c.name)) ??
      characters.find(c => c.name === name)
    );
  }
  return characters.find(ch => ch.name === name);
}

export function computeTipRewardEligibility(
  selectedTips: string[],
  characters: {
    name: string;
    price: number;
    styleName?: string | null;
  }[],
  textUnitPrice = 5
): TipRewardEligibility {
  let totalGbp = 0;
  const styleSet = new Set<string>();

  for (const name of selectedTips) {
    const c = resolveCharacter(name, characters);
    if (isTextTipName(name)) {
      totalGbp += textUnitPrice;
    } else if (c) {
      totalGbp += c.price;
    }
    const s = c?.styleName?.trim();
    if (s) styleSet.add(s);
  }

  const rewardGalaxy = totalGbp >= GALAXY_MIN_AMOUNT_GBP;
  const rewardTurbo = styleSet.size >= 3 || rewardGalaxy;

  return {
    rewardTurbo,
    rewardGalaxy,
    distinctStyleCount: styleSet.size,
    totalGbp,
  };
}

/** Cap displayed turbo progress at the unlock threshold (e.g. 3/3, not 4/3). */
export function displayTurboStyleCount(distinctStyleCount: number): number {
  return Math.min(distinctStyleCount, TURBO_MIN_DISTINCT_STYLES);
}

/** Cap displayed galaxy progress at the unlock threshold (e.g. £50/£50). */
export function displayGalaxyAmountGbp(totalGbp: number): number {
  return Math.min(totalGbp, GALAXY_MIN_AMOUNT_GBP);
}

/** One-based index (1…3): fill each flame as distinct styles accumulate; all fill when turbo unlocks. */
export function isTurboIconFilled(
  iconIndexOneBased: number,
  eligibility: TipRewardEligibility
): boolean {
  if (eligibility.rewardTurbo) {
    return iconIndexOneBased <= TURBO_MIN_DISTINCT_STYLES;
  }
  return eligibility.distinctStyleCount >= iconIndexOneBased;
}

/** Zero-based index (0…4): fill each sparkle per £10 toward £50 galaxy threshold. */
export function isGalaxyIconFilled(
  iconIndexZeroBased: number,
  eligibility: TipRewardEligibility
): boolean {
  const step = GALAXY_MIN_AMOUNT_GBP / GALAXY_ICON_COUNT;
  return eligibility.totalGbp >= (iconIndexZeroBased + 1) * step;
}
