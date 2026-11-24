/**
 * Wallet debit attaches tipQuoteId whenever TipDrawer provides ensureTipQuoteId
 * (any payment surface — backend requires quotes for all surfaces on live tip config).
 */
export function shouldRequestTipQuoteForWalletDebit(
  ensureTipQuoteId: (() => Promise<string | undefined>) | undefined,
  mode: string
): boolean {
  return Boolean(ensureTipQuoteId) && mode === "tip";
}
