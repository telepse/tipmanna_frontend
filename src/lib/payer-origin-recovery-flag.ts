/** P0-B payer-origin animation recovery (fallback only; default off). */
export function isPayerOriginRecoveryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYER_ORIGIN_RECOVERY === "true";
}
