/** Keep in sync with backend `WALLET_MIN_TOPUP_GBP`. */
export const WALLET_MIN_TOPUP_GBP = 10;

export const WALLET_DEBIT_IN_MODAL =
  process.env.NEXT_PUBLIC_WALLET_IN_MODAL_SUCCESS !== "false";

export const WALLET_STANDALONE_TOPUP =
  process.env.NEXT_PUBLIC_WALLET_STANDALONE_TOPUP !== "false";
