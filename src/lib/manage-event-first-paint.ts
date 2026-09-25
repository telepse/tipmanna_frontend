/** TipLink tab does not need host event messages for first paint. */
export function shouldDeferHostEventMessagesForTab(
  tab: string | null | undefined
): boolean {
  return tab?.trim() === "tiplink";
}
