"use client";

const STORAGE_KEY = "tipmanna:playback-return:v1";
const TTL_MS = 30 * 60 * 1000;

export type PlaybackReturnContext = {
  returnTo: string;
  label?: string;
  explore?: {
    feedStorageKey: string;
    activeIndex: number;
    scrollTop: number;
  };
  drawer?: {
    type: "creator" | "community";
    username?: string;
    communityId?: string;
  };
  profileUi?: {
    tab: string;
    subtabId?: string;
    scrollY: number;
  };
  createdAt: number;
};

export function safeInternalPlaybackPath(
  path: string | null | undefined
): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

export function writePlaybackReturn(
  context: Omit<PlaybackReturnContext, "createdAt">
): void {
  if (typeof window === "undefined") return;
  const returnTo = safeInternalPlaybackPath(context.returnTo);
  if (!returnTo) return;
  try {
    const payload: PlaybackReturnContext = {
      ...context,
      returnTo,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readPlaybackReturn(): PlaybackReturnContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaybackReturnContext;
    if (!parsed?.returnTo || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const returnTo = safeInternalPlaybackPath(parsed.returnTo);
    if (!returnTo) return null;
    return { ...parsed, returnTo };
  } catch {
    return null;
  }
}

export function clearPlaybackReturn(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function peekPlaybackReturn(): PlaybackReturnContext | null {
  return readPlaybackReturn();
}

export function buildReturnToWithDrawerHints(
  baseReturnTo: string,
  drawer?: PlaybackReturnContext["drawer"]
): string {
  const safe = safeInternalPlaybackPath(baseReturnTo);
  if (!safe) return baseReturnTo;
  try {
    const url = new URL(safe, "http://local");
    if (drawer?.type === "creator" && drawer.username?.trim()) {
      url.searchParams.set(
        "creatorDrawer",
        drawer.username.trim().replace(/^@/, "")
      );
    }
    if (drawer?.type === "community" && drawer.communityId?.trim()) {
      url.searchParams.set("communityDrawer", drawer.communityId.trim());
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return safe;
  }
}
