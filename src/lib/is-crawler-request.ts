/** Conservative crawler UA detection for Discover SEO shell gating. */

import { isExploreDiscoverSeoDeferralEnabled } from "@/lib/explore-feature-flags";

const CRAWLER_UA_PATTERN =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|redditbot|applebot|whatsapp|flipboard|tumblr|bitlybot|skypeuripreview|nuzzel|discordbot|google page speed|qwantify|archive\.org_bot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider/i;

export function isCrawlerUserAgent(
  userAgent: string | null | undefined
): boolean {
  if (!userAgent?.trim()) return false;
  return CRAWLER_UA_PATTERN.test(userAgent);
}

export { isExploreDiscoverSeoDeferralEnabled } from "@/lib/explore-feature-flags";

export function shouldRenderExploreDiscoverSeoShell(opts: {
  tab?: string;
  userAgent?: string | null;
}): boolean {
  if (!isExploreDiscoverSeoDeferralEnabled()) return true;
  if (opts.tab === "discover") return true;
  return isCrawlerUserAgent(opts.userAgent);
}
