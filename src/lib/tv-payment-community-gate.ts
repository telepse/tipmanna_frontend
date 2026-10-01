import type { PersistedTvPaymentSnapshot } from "@/lib/tv-payment-snapshot";

/** Playback snapshot scoped to a TV schedule source (null = Tipmanna global). */
export type PaymentSnapshotCommunityScope = {
  scheduleSourceCommunityId?: string | null;
};

/**
 * Community id stored on a persisted payment snapshot.
 * `undefined` = legacy v1/v2 payload written before community isolation (unknown owner).
 */
export function persistedSnapshotCommunityId(
  snap: PersistedTvPaymentSnapshot | PaymentSnapshotCommunityScope
): string | null | undefined {
  if (!("scheduleSourceCommunityId" in snap)) {
    return undefined;
  }
  const id = snap.scheduleSourceCommunityId;
  if (id === undefined) return undefined;
  return id ?? null;
}

/**
 * Whether TV payment playback restore may apply for the current schedule source.
 * Mirrors tab playback snapshot gate: exact match on null-safe community id.
 *
 * Legacy/missing snapshot community → reject (do not guess global ownership).
 */
export function shouldApplyPersistedPaymentSnapshot(
  currentCommunityId: string | null,
  snapshotCommunityId: string | null | undefined
): boolean {
  if (snapshotCommunityId === undefined) {
    return false;
  }
  return (currentCommunityId ?? null) === snapshotCommunityId;
}
