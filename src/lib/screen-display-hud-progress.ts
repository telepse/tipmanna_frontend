/** Full-screen HUD: show raised/target labels when amounts are not hidden. */
export function hudProgressAmountLabelsVisible(
  hideProgressBarAmount: boolean | undefined | null,
  showRaisedAmount: boolean
): boolean {
  const shouldShowProgressAmounts = hideProgressBarAmount !== true;
  return shouldShowProgressAmounts && showRaisedAmount;
}
