import { buildCreatorProfileSharePath } from "@/lib/creator-profile-url";

export type CreatorProfileSurfaceVariant = "page" | "drawer";

/** Returns href to sync profile tab into URL, or null when drawer must not write Explore tab=. */
export function syncCreatorProfileTabToUrl(opts: {
  variant: CreatorProfileSurfaceVariant;
  pathname: string;
  currentQuery: string;
  tab: string;
}): string | null {
  if (opts.variant === "drawer") return null;
  const params = new URLSearchParams(opts.currentQuery);
  params.set("tab", opts.tab);
  const q = params.toString();
  return q ? `${opts.pathname}?${q}` : opts.pathname;
}

/** Creator profile path after username change, preserving current query (incl. tab=). */
export function buildCreatorProfileSharePathWithQuery(
  username: string,
  currentQuery: string,
  opts?: { activeTab?: string | null }
): string {
  const path = buildCreatorProfileSharePath(username);
  const params = new URLSearchParams(currentQuery);
  const tab = opts?.activeTab?.trim() || params.get("tab");
  if (tab) {
    params.set("tab", tab);
  }
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

/**
 * Whether URL searchParams should drive activeTab while a tab replace is in flight.
 */
export function shouldApplyCreatorProfileTabFromUrl(opts: {
  urlTab: string | null;
  pendingTab: string | null;
  isValidTab: (tab: string) => boolean;
}): boolean {
  if (!opts.urlTab || !opts.isValidTab(opts.urlTab)) return false;
  if (opts.pendingTab && opts.urlTab !== opts.pendingTab) return false;
  return true;
}
