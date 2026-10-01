/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";

import {
  persistedSnapshotCommunityId,
  shouldApplyPersistedPaymentSnapshot,
} from "@/lib/tv-payment-community-gate";
import {
  clearPersistedPaymentSnapshot,
  readPersistedPaymentSnapshot,
  TV_PAYMENT_SNAPSHOT_KEY,
  writePersistedPaymentSnapshot,
  type PersistedTvPaymentSnapshot,
} from "@/lib/tv-payment-snapshot";
import {
  clearTvPlaybackSnapshotForTests,
  readTvPlaybackSnapshot,
  writeTvPlaybackSnapshot,
} from "@/lib/tv-playback-session";

function basePaymentSnap(
  overrides: Partial<PersistedTvPaymentSnapshot> = {}
): PersistedTvPaymentSnapshot {
  return {
    v: 2,
    mode: "LOCAL",
    originMode: "GLOBAL",
    currentIndex: 2,
    currentTime: 45,
    wasPlaying: true,
    wasMuted: false,
    playingItemOverrideId: null,
    schedulePlayingSlot: null,
    localModeReason: "tip_drawer",
    scheduleSourceCommunityId: "comm-a",
    ...overrides,
  };
}

/** Mirrors Stripe hydrate gate in tv-provider (read → gate → clear on mismatch). */
function hydrateWouldApplyPlaybackRestore(
  currentCommunityId: string | null
): boolean {
  const persisted = readPersistedPaymentSnapshot();
  if (!persisted) return false;
  return shouldApplyPersistedPaymentSnapshot(
    currentCommunityId,
    persistedSnapshotCommunityId(persisted)
  );
}

describe("shouldApplyPersistedPaymentSnapshot", () => {
  it("PI-A — same community accepts restore", () => {
    expect(shouldApplyPersistedPaymentSnapshot("comm-a", "comm-a")).toBe(true);
    expect(shouldApplyPersistedPaymentSnapshot(null, null)).toBe(true);
  });

  it("PI-B — different communities reject restore", () => {
    expect(shouldApplyPersistedPaymentSnapshot("comm-b", "comm-a")).toBe(false);
  });

  it("snapshot community A + current null rejects", () => {
    expect(shouldApplyPersistedPaymentSnapshot(null, "comm-a")).toBe(false);
  });

  it("legacy snapshot missing community identity rejects", () => {
    expect(shouldApplyPersistedPaymentSnapshot(null, undefined)).toBe(false);
    expect(shouldApplyPersistedPaymentSnapshot("comm-a", undefined)).toBe(
      false
    );
  });

  it("PI-C — same eventId irrelevant; community mismatch still rejects", () => {
    const legacy = basePaymentSnap({
      scheduleSourceCommunityId: "comm-a",
    });
    expect(
      shouldApplyPersistedPaymentSnapshot(
        "comm-b",
        legacy.scheduleSourceCommunityId
      )
    ).toBe(false);
  });
});

describe("persistedSnapshotCommunityId", () => {
  it("returns undefined for legacy payloads without field", () => {
    const legacy = {
      v: 2 as const,
      mode: "LOCAL" as const,
      currentIndex: 0,
      currentTime: 0,
      wasPlaying: false,
      wasMuted: true,
      playingItemOverrideId: null,
      schedulePlayingSlot: null,
      localModeReason: null,
    };
    expect(persistedSnapshotCommunityId(legacy)).toBeUndefined();
  });
});

describe("sessionStorage payment snapshot + hydrate gate", () => {
  afterEach(() => {
    clearPersistedPaymentSnapshot();
  });

  it("PI-E — mismatched community: hydrate gate rejects and snapshot cleared", () => {
    writePersistedPaymentSnapshot(
      basePaymentSnap({ scheduleSourceCommunityId: "comm-a" })
    );
    expect(hydrateWouldApplyPlaybackRestore("comm-b")).toBe(false);
    clearPersistedPaymentSnapshot();
    expect(readPersistedPaymentSnapshot()).toBeNull();
  });

  it("same-community Stripe return accepts restoration gate", () => {
    writePersistedPaymentSnapshot(
      basePaymentSnap({ scheduleSourceCommunityId: "comm-a" })
    );
    expect(hydrateWouldApplyPlaybackRestore("comm-a")).toBe(true);
  });

  it("PI-F — after source-change cleanup snapshot is gone", () => {
    writePersistedPaymentSnapshot(
      basePaymentSnap({ scheduleSourceCommunityId: "comm-a" })
    );
    clearPersistedPaymentSnapshot();
    expect(readPersistedPaymentSnapshot()).toBeNull();
    expect(hydrateWouldApplyPlaybackRestore("comm-b")).toBe(false);
  });
});

/** Same null-safe equality as `applyTabPlaybackSnapshotRestore` in tv-provider. */
function tabSnapshotRestoreAllowed(
  currentCommunityId: string | null,
  snapshotCommunityId: string | null
): boolean {
  return (currentCommunityId ?? null) === (snapshotCommunityId ?? null);
}

describe("PI-D — tab playback snapshot community gate unchanged", () => {
  afterEach(() => {
    clearTvPlaybackSnapshotForTests();
  });

  it("tab snapshot restore gate rejects community mismatch", () => {
    writeTvPlaybackSnapshot({
      mode: "LOCAL",
      currentIndex: 1,
      startSeconds: 10,
      videoId: "v1",
      communityId: "comm-a",
    });
    const snap = readTvPlaybackSnapshot();
    expect(tabSnapshotRestoreAllowed("comm-b", snap?.communityId ?? null)).toBe(
      false
    );
  });

  it("tab snapshot allows same community", () => {
    writeTvPlaybackSnapshot({
      mode: "LOCAL",
      currentIndex: 1,
      startSeconds: 10,
      videoId: "v1",
      communityId: "comm-a",
    });
    const snap = readTvPlaybackSnapshot();
    expect(tabSnapshotRestoreAllowed("comm-a", snap?.communityId ?? null)).toBe(
      true
    );
  });
});

describe("legacy persisted payment snapshot in sessionStorage", () => {
  afterEach(() => {
    clearPersistedPaymentSnapshot();
  });

  it("rejects hydrate when community field absent on stored v2 payload", () => {
    sessionStorage.setItem(
      TV_PAYMENT_SNAPSHOT_KEY,
      JSON.stringify({
        v: 2,
        mode: "LOCAL",
        currentIndex: 0,
        currentTime: 0,
        wasPlaying: false,
        wasMuted: true,
        playingItemOverrideId: null,
        schedulePlayingSlot: null,
        localModeReason: null,
      })
    );
    expect(hydrateWouldApplyPlaybackRestore("comm-a")).toBe(false);
  });
});
