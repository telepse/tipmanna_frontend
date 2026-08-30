/** Local payer animation when server recovery fails (on unless env is "false"). */
export function isPayerLocalAnimationFallbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYER_LOCAL_ANIMATION_FALLBACK !== "false";
}
