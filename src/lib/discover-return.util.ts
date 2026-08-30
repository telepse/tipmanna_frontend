"use client";

import type { DiscoverSurface } from "@/lib/discover-content-routing";

const DISCOVER_RESTORE_KEY = "tipmanna:discover-ui-restore:v1";
const RESTORE_TTL_MS = 30 * 60 * 1000;
export const DISCOVER_CATALOG_READY_EVENT = "tipmanna:discover-catalog-ready";

export function notifyDiscoverCatalogReady(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DISCOVER_CATALOG_READY_EVENT));
}

export type DiscoverScrollRoot = "window" | "container";

export type DiscoverUiSnapshot = {
  surface: DiscoverSurface;
  scrollTop: number;
  scrollRoot?: DiscoverScrollRoot;
  searchTerm: string;
  selectedTag: string | null;
  expandedRails: Record<string, boolean>;
  createdAt: number;
};

/** True when the overflow element is the live scroller (not the document). */
export function isOverflowScrollContainer(
  el: HTMLElement | null | undefined
): boolean {
  if (!el) return false;
  return el.scrollHeight - el.clientHeight > 2;
}

export function resolveDiscoverScroll(
  container: HTMLElement | null | undefined
): { scrollTop: number; scrollRoot: DiscoverScrollRoot } {
  if (typeof window === "undefined") {
    return { scrollTop: 0, scrollRoot: "window" };
  }
  if (isOverflowScrollContainer(container)) {
    return { scrollTop: container!.scrollTop, scrollRoot: "container" };
  }
  const windowTop =
    window.scrollY || document.documentElement.scrollTop || 0;
  return { scrollTop: windowTop, scrollRoot: "window" };
}

export function applyDiscoverScrollRestore(
  snapshot: Pick<DiscoverUiSnapshot, "scrollTop" | "scrollRoot" | "surface">,
  container?: HTMLElement | null
): void {
  if (typeof window === "undefined") return;
  const top = snapshot.scrollTop;
  if (top <= 0) return;

  const preferWindow =
    snapshot.scrollRoot === "window" ||
    (snapshot.surface === "discovery" && !isOverflowScrollContainer(container));

  if (preferWindow) {
    window.scrollTo({ top, behavior: "auto" });
    return;
  }
  container?.scrollTo({ top, behavior: "auto" });
}

export function scheduleDiscoverScrollRestore(
  snapshot: Pick<DiscoverUiSnapshot, "scrollTop" | "scrollRoot" | "surface">,
  getContainer: () => HTMLElement | null | undefined
): () => void {
  const delays = [0, 50, 200, 500];
  const timers: number[] = [];
  const run = () => applyDiscoverScrollRestore(snapshot, getContainer());
  run();
  if (typeof window === "undefined") return () => undefined;
  requestAnimationFrame(run);
  for (const ms of delays.slice(1)) {
    timers.push(window.setTimeout(run, ms));
  }
  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}

export function isDedicatedDiscoverReturnTo(path: string | null | undefined): boolean {
  if (!path) return false;
  return path === "/discover" || path.startsWith("/discover?") || path.startsWith("/discover/");
}

export function buildDiscoverReturnTo(input: {
  surface: DiscoverSurface;
  pathname: string;
  searchParams: URLSearchParams | string;
  searchTerm?: string;
}): string {
  const raw =
    typeof input.searchParams === "string"
      ? input.searchParams
      : input.searchParams.toString();
  const params = new URLSearchParams(raw);

  if (input.surface === "explorePanel") {
    params.delete("tab");
    params.delete("joinCommunity");
    params.delete("channel");
    params.delete("eventId");
    params.set("discoverPanel", "1");
    const q = params.toString();
    return q ? `/explore?${q}` : "/explore?discoverPanel=1";
  }

  if (input.surface === "exploreTab") {
    params.delete("discoverPanel");
    params.delete("channel");
    params.delete("eventId");
    params.set("tab", "discover");
    const q = params.toString();
    return q ? `/explore?${q}` : "/explore?tab=discover";
  }

  const base = input.pathname?.trim() || "/discover";
  const dedicatedParams = new URLSearchParams(params.toString());
  dedicatedParams.delete("discoverPanel");
  dedicatedParams.delete("tab");
  dedicatedParams.delete("joinCommunity");
  dedicatedParams.delete("channel");
  dedicatedParams.delete("eventId");
  const term = input.searchTerm?.trim();
  if (term) dedicatedParams.set("q", term);
  else if (!dedicatedParams.has("q")) dedicatedParams.delete("q");
  const q = dedicatedParams.toString();
  return q ? `${base}?${q}` : base;
}

export function buildDiscoverUiSnapshot(input: {
  surface: DiscoverSurface;
  scrollTop: number;
  scrollRoot?: DiscoverScrollRoot;
  searchTerm: string;
  selectedTag: string | null;
  expandedRails: Record<string, boolean>;
}): DiscoverUiSnapshot {
  return {
    surface: input.surface,
    scrollTop: Math.max(0, input.scrollTop),
    scrollRoot: input.scrollRoot,
    searchTerm: input.searchTerm.trim(),
    selectedTag: input.selectedTag,
    expandedRails: { ...input.expandedRails },
    createdAt: Date.now(),
  };
}

export function stashDiscoverUiRestore(snapshot: DiscoverUiSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISCOVER_RESTORE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function peekDiscoverUiRestore(): DiscoverUiSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DISCOVER_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoverUiSnapshot;
    if (!parsed?.surface || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > RESTORE_TTL_MS) {
      sessionStorage.removeItem(DISCOVER_RESTORE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function consumeDiscoverUiRestore(
  surface?: DiscoverSurface
): DiscoverUiSnapshot | null {
  const snapshot = peekDiscoverUiRestore();
  if (!snapshot) return null;
  if (surface && snapshot.surface !== surface) return null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(DISCOVER_RESTORE_KEY);
    } catch {
      /* ignore */
    }
  }
  return snapshot;
}

/** Strip one-shot panel reopen flag after the sheet has opened. */
export function stripDiscoverPanelParam(searchParamsKey: string): string {
  const params = new URLSearchParams(searchParamsKey);
  if (!params.has("discoverPanel")) return searchParamsKey;
  params.delete("discoverPanel");
  return params.toString();
}
