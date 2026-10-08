import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { safeJsonLdStringify } from "@/lib/json-ld-safe";

const EXPLORE_SEO_FEED_COUNT = 6;

type ExploreFeedSeoItem = {
  id: string;
  title: string;
  url: string;
  event?: { id?: string };
};

export function exploreFeedSeoItemsFromBoot(
  items?: unknown[] | null
): ExploreFeedSeoItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (row): row is ExploreFeedSeoItem =>
        !!row &&
        typeof row === "object" &&
        typeof (row as ExploreFeedSeoItem).id === "string" &&
        typeof (row as ExploreFeedSeoItem).title === "string" &&
        typeof (row as ExploreFeedSeoItem).url === "string"
    )
    .slice(0, EXPLORE_SEO_FEED_COUNT);
}

function buildExploreItemListJsonLd(items: ExploreFeedSeoItem[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Explore feed — Tipmanna",
    url: getPublicAbsoluteUrl("/explore"),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => {
      const eventId =
        typeof item.event?.id === "string" ? item.event.id.trim() : "";
      const pageUrl =
        eventId && item.id
          ? buildContentShareUrl({ eventId, channelId: item.id })
          : getPublicAbsoluteUrl("/explore");
      const thumb = getYoutubeThumbnail(item.url);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "VideoObject",
          name: item.title,
          url: pageUrl,
          ...(thumb ? { thumbnailUrl: thumb } : {}),
          ...(item.url ? { embedUrl: item.url } : {}),
        },
      };
    }),
  };
}

export function ExploreSeoJsonLd({ items }: { items?: unknown[] | null }) {
  const feedSeoItems = exploreFeedSeoItemsFromBoot(items);
  const feedItemListJsonLd = buildExploreItemListJsonLd(feedSeoItems);
  if (!feedItemListJsonLd) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLdStringify(feedItemListJsonLd),
      }}
    />
  );
}
