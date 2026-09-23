export const TIPLINK_MONEY_FOR_MAX = 80;

export function formatTipLinkRaisedLine({
  moneyFor,
  amountRaised,
  amountToRaise,
  tips,
  showAmounts = true,
}: {
  moneyFor?: string | null;
  amountRaised: number;
  amountToRaise: number;
  tips: number;
  showAmounts?: boolean;
}): string | null {
  if (showAmounts === false) return null;

  const raised = `£${amountRaised.toFixed(2)}`;
  const amounts =
    amountToRaise > 0
      ? `${raised} / £${amountToRaise.toFixed(2)} raised`
      : `${raised} raised`;
  const purpose = moneyFor?.trim();
  const prefix = purpose ? `towards ${purpose} ` : "";

  return `
    ${amounts}
    ${tips} tips received ${prefix}
  `;
}
