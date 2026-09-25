/**
 * Pure helpers for dashboard gate ready state (unit-tested).
 */

export function shouldKeepDashboardContentDuringProbe(input: {
  hadWriteGrant: boolean;
  grantValid: boolean;
  probeLoading: boolean;
}): boolean {
  if (!input.probeLoading) return true;
  return input.hadWriteGrant || input.grantValid;
}

/** Initial gate ready when a verify-success grant is still valid (not cookie-only). */
export function shouldInitDashboardReady(grantValid: boolean): boolean {
  return grantValid;
}
