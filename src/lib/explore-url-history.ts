import { exploreHrefsEqual } from "@/lib/explore-url-sync-policy";

export type ExploreHistoryCommitSource =
  | "feed-subtab-click"
  | "main-tab-click"
  | "filter-change"
  | "filter-lang-change"
  | "filter-country-change"
  | "community-selection"
  | "discover-expand"
  | "passive-sync"
  | "join-tab-guard"
  | "overlay-play";

/** True for same-origin hrefs under /explore (relative or absolute). */
export function isExploreSameOriginHref(href: string): boolean {
  if (href.startsWith("/explore")) return true;
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(href, window.location.origin);
    return (
      u.origin === window.location.origin && u.pathname.startsWith("/explore")
    );
  } catch {
    return false;
  }
}

function exploreHistoryTarget(href: string): string | null {
  if (typeof window === "undefined") {
    return href.startsWith("/") ? href : null;
  }
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    if (!u.pathname.startsWith("/explore")) return null;
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/** Sole writer for same-path Explore query navigation (native History API only). */
export function commitExploreHistory(opts: {
  href: string;
  mode: "push" | "replace";
  source: ExploreHistoryCommitSource;
}): boolean {
  void opts.source;
  if (typeof window === "undefined") return false;
  const target = exploreHistoryTarget(opts.href);
  if (!target) return false;

  const current = `${window.location.pathname}${window.location.search}`;
  if (exploreHrefsEqual(target, current)) return false;

  const state = window.history.state;
  if (opts.mode === "replace") {
    window.history.replaceState(state, "", target);
  } else {
    window.history.pushState(state, "", target);
  }
  return true;
}

export function exploreCurrentBrowserHref(): string {
  if (typeof window === "undefined") return "/explore";
  return `${window.location.pathname}${window.location.search}`;
}
