/** Mirror backend tip-reward-flags.util.ts for preview UI. */
export const GALAXY_MIN_AMOUNT_GBP = 50;
export const TURBO_MIN_DISTINCT_STYLES = 3;

export type TipRewardEligibility = {
  rewardTurbo: boolean;
  rewardGalaxy: boolean;
  distinctStyleCount: number;
  totalGbp: number;
};

function isTextTipName(name: string): boolean {
  const n = name.trim();
  return n === "Text" || n === "Add Text";
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
  const rewardTurbo =
    styleSet.size >= TURBO_MIN_DISTINCT_STYLES || rewardGalaxy;

  return {
    rewardTurbo,
    rewardGalaxy,
    distinctStyleCount: styleSet.size,
    totalGbp,
  };
}
