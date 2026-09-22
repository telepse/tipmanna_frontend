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
