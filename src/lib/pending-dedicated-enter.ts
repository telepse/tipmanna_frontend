const STORAGE_KEY = "pending_dedicated_enter";

export type PendingDedicatedEnter = {
  communityId: string;
  requestedAt: string;
};

export function setPendingDedicatedEnter(communityId: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingDedicatedEnter = {
      communityId,
      requestedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearPendingDedicatedEnter(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readPendingDedicatedEnter(): PendingDedicatedEnter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDedicatedEnter;
    return parsed?.communityId ? parsed : null;
  } catch {
    return null;
  }
}
