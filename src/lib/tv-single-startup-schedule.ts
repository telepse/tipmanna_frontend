/**
 * Phase A — single intentional startup schedule load (testable helpers).
 *
 * When `NEXT_PUBLIC_TV_SINGLE_STARTUP_SCHEDULE=1`, TVProvider uses these
 * semantics to avoid duplicate initial schedule network requests.
 */

export function tvScheduleSessionCacheKey(communityId: string | null): string {
  return communityId
    ? `tipmanna-tv-schedule-v2-c/${communityId}`
    : "tipmanna-tv-schedule-v2";
}

/** Snapshot schedule sessionStorage keys that existed before this navigation's writes. */
export function snapshotPreNavigationScheduleCacheKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const keys = new Set<string>();
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (
        k === "tipmanna-tv-schedule-v2" ||
        k.startsWith("tipmanna-tv-schedule-v2-c/")
      ) {
        keys.add(k);
      }
    }
  } catch {
    /* private mode / quota */
  }
  return keys;
}

export type ScheduleSourceChangeDecision =
  | { action: "skip"; reason: "initial_establishment" | "same_value" }
  | { action: "apply"; reason: "genuine_change" };

/**
 * Distinguish initial source establishment from a genuine post-mount change.
 * `previousSource === undefined` means the source effect has not run yet.
 */
export function resolveScheduleSourceChange(
  previousSource: string | null | undefined,
  nextSource: string | null
): ScheduleSourceChangeDecision {
  if (previousSource === undefined) {
    return { action: "skip", reason: "initial_establishment" };
  }
  if (previousSource === nextSource) {
    return { action: "skip", reason: "same_value" };
  }
  return { action: "apply", reason: "genuine_change" };
}

export type SessionCacheBootstrapDecision = {
  shouldBootstrap: boolean;
  /** SWR bootstrap phase is complete (either bootstrapped or cold — no second pass). */
  markSwrBootstrapped: boolean;
};

/**
 * Phase A SWR bootstrap: only pre-navigation cache counts as startup bootstrap.
 * Legacy path (singleStartupEnabled=false): any valid cache bootstraps once.
 */
export function resolveSessionCacheBootstrap(opts: {
  singleStartupEnabled: boolean;
  swrEnabled: boolean;
  swrBootstrapped: boolean;
  cacheKey: string;
  hasValidCache: boolean;
  preNavigationCacheKeys: Set<string>;
  cacheWrittenThisNavigation: Set<string>;
}): SessionCacheBootstrapDecision {
  if (!opts.swrEnabled || opts.swrBootstrapped) {
    return { shouldBootstrap: false, markSwrBootstrapped: false };
  }

  if (!opts.hasValidCache) {
    return { shouldBootstrap: false, markSwrBootstrapped: true };
  }

  if (!opts.singleStartupEnabled) {
    return { shouldBootstrap: true, markSwrBootstrapped: true };
  }

  const preExisting = opts.preNavigationCacheKeys.has(opts.cacheKey);
  const writtenThisNav = opts.cacheWrittenThisNavigation.has(opts.cacheKey);

  if (!preExisting || writtenThisNav) {
    return { shouldBootstrap: false, markSwrBootstrapped: true };
  }

  return { shouldBootstrap: true, markSwrBootstrapped: true };
}

export function shouldSuppressVisibilityScheduleRefresh(opts: {
  singleStartupEnabled: boolean;
  visibilityState: DocumentVisibilityState;
  documentWasHidden: boolean;
  initialStartupInFlight: boolean;
  initialStartupComplete: boolean;
}): boolean {
  if (!opts.singleStartupEnabled) return false;
  if (opts.visibilityState !== "visible") return false;
  if (opts.initialStartupInFlight) return true;
  if (!opts.initialStartupComplete && !opts.documentWasHidden) return true;
  return false;
}
