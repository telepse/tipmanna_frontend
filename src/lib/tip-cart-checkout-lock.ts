/** Pure helpers for tip drawer checkout UI (cart lock + sheet visibility). */

export type TipCartCheckoutLockInput = {
  isProcessing: boolean;
  isRedirecting: boolean;
  checkoutSheetSuppressed: boolean;
  walletDialogOpen: boolean;
};

export function isTipCartLocked(input: TipCartCheckoutLockInput): boolean {
  return (
    input.isProcessing ||
    input.isRedirecting ||
    input.checkoutSheetSuppressed ||
    input.walletDialogOpen
  );
}

export type TipDrawerSheetOpenInput = {
  parentOpen: boolean;
  checkoutSheetSuppressed: boolean;
  isRedirecting: boolean;
  walletDialogOpen: boolean;
};

/** Local Vaul sheet open — parent `open` may stay true to keep Stripe mounted. */
export function tipDrawerSheetOpen(input: TipDrawerSheetOpenInput): boolean {
  return (
    input.parentOpen &&
    !input.checkoutSheetSuppressed &&
    !input.isRedirecting &&
    !input.walletDialogOpen
  );
}

export function tipCheckoutDismissBlocked(
  input: TipCartCheckoutLockInput
): boolean {
  return isTipCartLocked(input);
}
