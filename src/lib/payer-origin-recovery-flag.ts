/** P0-B payer-origin animation recovery (fallback only; on unless env is "false"). */
export function isPayerOriginRecoveryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYER_ORIGIN_RECOVERY !== "false";
}
