"use client";

import { getHostLinkAction, type HostLinkResponse } from "@/actions/auth";

type HostLinkFetchResult =
  | { success: true; data: HostLinkResponse }
  | { success: false; data?: undefined };

const cache = new Map<string, HostLinkResponse>();
const inFlight = new Map<string, Promise<HostLinkFetchResult>>();

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach(fn => fn());
}

export function subscribeHostLinkCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedHostLink(userId: string): HostLinkResponse | null {
  return cache.get(userId) ?? null;
}

/** Clears cached host-link rows (all users or one tipper id). */
export function invalidateHostLinkCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
    inFlight.delete(userId);
  } else {
    cache.clear();
    inFlight.clear();
  }
  notifyListeners();
}

export async function getOrFetchHostLink(
  userId: string,
  token: string
): Promise<HostLinkFetchResult> {
  const cached = cache.get(userId);
  if (cached) {
    return { success: true, data: cached };
  }

  const existing = inFlight.get(userId);
  if (existing) return existing;

  const promise = (async (): Promise<HostLinkFetchResult> => {
    const res = await getHostLinkAction(token);
    if (res.success && res.data) {
      cache.set(userId, res.data);
      notifyListeners();
      return { success: true, data: res.data };
    }
    return { success: false };
  })();

  inFlight.set(userId, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(userId);
  }
}

/** Fire-and-forget host-link warm when caller already has tipper id + token. */
export function warmHostLink(userId: string, token: string): void {
  void getOrFetchHostLink(userId, token);
}
