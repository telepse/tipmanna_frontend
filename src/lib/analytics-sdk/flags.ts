/** Master gate — surface XOR flags arrive in P1-4; default off in production. */
export function isAnalyticsSdkEnabled(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_ANALYTICS_SDK_V2 === "true";
}
