"use client";

import { getAuthToken } from "@/lib/getAuthToken";
import { getHostUserFromCookies } from "@/lib/host-session-client";
import { warmHostLink } from "@/lib/host-link-cache";
import { isHostSessionGrantValid } from "@/lib/host-session-grant";
import { probeHostSessionVerified } from "@/lib/host-session-probe";

/**
 * Prefetch Tier A host-link and (when host cookies exist) single-flight verify.
 * Safe to call from hover/click; does not change auth outcomes.
 */
export function warmHostSessionIntent(userId?: string | null): void {
  void warmHostSessionIntentAsync(userId);
}

export async function warmHostSessionIntentAsync(
  userId?: string | null
): Promise<void> {
  const token = getAuthToken()?.trim();
  if (userId && token) {
    warmHostLink(userId, token);
  }

  const hostUser = getHostUserFromCookies();
  if (hostUser?.id && !isHostSessionGrantValid(hostUser.id)) {
    await probeHostSessionVerified();
  }
}

/** Whether intent prefetch should call verify (exported for tests). */
export function shouldPrefetchHostSessionVerify(
  hostId: string | null | undefined
): boolean {
  return Boolean(hostId) && !isHostSessionGrantValid(hostId);
}
