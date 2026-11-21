/** Web/TV contract: show progress amounts when hideProgressBarAmount is not true. */
export function progressBarAmountVisible(
  hideProgressBarAmount: boolean | undefined | null
): boolean {
  return hideProgressBarAmount !== true;
}

/** Host modal switch labeled "Show amount on progress bar" vs persisted hide flag. */
export function showAmountOnProgressBarToggleChecked(
  hideProgressBarAmount: boolean
): boolean {
  return !hideProgressBarAmount;
}

export function hideProgressBarAmountFromShowToggle(show: boolean): boolean {
  return !show;
}
