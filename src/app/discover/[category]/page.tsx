import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DiscoverPageClient } from "@/components/discover/discover-page-client";
import { searchContentsAction } from "@/actions/contents";
import { loadDiscoverCatalogServer } from "@/lib/discover-catalog-server";
import {
  eventTypeOptionBySlug,
  eventTypeLabel,
} from "@/lib/event-type-options";
import { getDiscoveryAbsoluteUrl } from "@/lib/site-config";
import { buildContentShareUrl } from "@/lib/public-video-url";

type PageProps = { params: Promise<{ category: string }> };

type DiscoverCategoryItem = {
  id?: string;
  title?: string;
  event?: { id?: string };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  const opt = eventTypeOptionBySlug(category);
  if (!opt) {
    return { title: "Discover — Tipmanna" };
  }
  const title = `${opt.label} videos on Tipmanna`;
  const description = `Browse ${opt.label.toLowerCase()} community clips, live streams, and programs on Tipmanna Discover.`;
  return {
    title,
    description,
    alternates: {
      canonical: getDiscoveryAbsoluteUrl(`/discover/${opt.slug}`),
    },
    openGraph: {
      title,
      description,
      url: getDiscoveryAbsoluteUrl(`/discover/${opt.slug}`),
      type: "website",
      siteName: "Tipmanna",
    },
  };
}

export default async function DiscoverCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const opt = eventTypeOptionBySlug(category);
  if (!opt) notFound();

  const [catalog, categoryRes] = await Promise.all([
    loadDiscoverCatalogServer(),
    searchContentsAction("", 40, opt.value),
  ]);

  const categoryItems: DiscoverCategoryItem[] =
    categoryRes.success && Array.isArray(categoryRes.data)
      ? (categoryRes.data as DiscoverCategoryItem[])
      : [];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${eventTypeLabel(opt.value)} — Tipmanna Discover`,
    url: getDiscoveryAbsoluteUrl(`/discover/${opt.slug}`),
    description: `Community ${opt.label.toLowerCase()} videos on Tipmanna.`,
    hasPart: categoryItems.slice(0, 12).map((row, index) => {
      const eventId = row?.event?.id;
      const channelId = row?.id;
      const url =
        eventId && channelId
          ? buildContentShareUrl({ eventId, channelId })
          : getDiscoveryAbsoluteUrl(`/discover/${opt.slug}`);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: { "@type": "VideoObject", name: row?.title ?? "Video", url },
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <header className="mx-auto max-w-6xl border-b px-4 py-4">
        <p className="text-muted-foreground text-xs">
          <Link href="/discover">Discover</Link> / {opt.label}
        </p>
        <h1 className="text-xl font-semibold">{opt.label} on Tipmanna</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Long-tail discovery for {opt.label.toLowerCase()} community media.
        </p>
      </header>
      <DiscoverPageClient
        initialContents={
          (categoryItems.length ? categoryItems : catalog.contents) as never[]
        }
        initialLatest={catalog.latest as never[]}
        initialSpotlight={catalog.spotlight as never[]}
        initialRecommended={catalog.recommended as never[]}
        initialMostTipped={catalog.mostTipped as never[]}
        initialPrograms={catalog.programs as never[]}
        initialLiveStreams={catalog.liveStreams as never}
        initialTippers={catalog.tippers as never[]}
      />
    </>
  );
}
