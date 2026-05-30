/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";

import {
  getAllCharacterSets,
  getCharactersForTipping,
} from "@/actions/characters";
import {
  postExploreFeedBatchAction,
  type ExploreFeedBatchData,
} from "@/actions/contents";
import ExplorePageClient from "@/components/explore/explore-page-client";
import { getYoutubeThumbnail } from "@/lib/extractYoutubeID";
import { buildContentShareUrl } from "@/lib/public-video-url";
import { getPublicAbsoluteUrl } from "@/lib/site-config";

const EXPLORE_SEO_FEED_COUNT = 6;

type ExploreFeedSeoItem = {
  id: string;
  title: string;
  url: string;
  event?: { id?: string };
};

async function fetchExploreFeedSeoItems(): Promise<ExploreFeedSeoItem[]> {
  const res = await postExploreFeedBatchAction(
    [],
    undefined,
    EXPLORE_SEO_FEED_COUNT
  );
  if (!res.success || !res.data) return [];
  const items = (res.data as ExploreFeedBatchData).items;
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

export default async function ExplorePage() {
  const [{ data: characters }, { data: characterSets }, feedSeoItems] =
    await Promise.all([
      getCharactersForTipping(),
      getAllCharacterSets(),
      fetchExploreFeedSeoItems(),
    ]);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tipmanna",
    url: getPublicAbsoluteUrl("/explore"),
    description:
      "Discover and tip on community clips, live events, and trending videos on Tipmanna.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${getPublicAbsoluteUrl("/explore")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const exploreJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Explore — Tipmanna",
    url: getPublicAbsoluteUrl("/explore"),
    description:
      "Watch and tip on trending community videos, live events, and creator content.",
    isPartOf: {
      "@type": "WebSite",
      name: "Tipmanna",
      url: getPublicAbsoluteUrl("/"),
    },
  };

  const feedItemListJsonLd = buildExploreItemListJsonLd(feedSeoItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(exploreJsonLd) }}
      />
      {feedItemListJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(feedItemListJsonLd),
          }}
        />
      ) : null}
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] items-center justify-center">
            Loading explore…
          </div>
        }
      >
        <ExplorePageClient
          characters={(characters as any[]) ?? []}
          characterSets={(characterSets as any[]) ?? []}
        />
      </Suspense>
    </>
  );
}
