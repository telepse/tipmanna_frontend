import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DiscoverPageClient } from "@/components/discover/discover-page-client";
import { discoverySearchAction } from "@/actions/contents";
import { loadDiscoverCatalogServer } from "@/lib/discover-catalog-server";
import {
  eventTypeOptionBySlug,
  eventTypeLabel,
} from "@/lib/event-type-options";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
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
      canonical: getPublicAbsoluteUrl(`/discover/${opt.slug}`),
    },
    openGraph: {
      title,
      description,
      url: getPublicAbsoluteUrl(`/discover/${opt.slug}`),
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
    discoverySearchAction("", 40, opt.value),
  ]);

  const categoryItems: DiscoverCategoryItem[] =
    categoryRes.success && categoryRes.data?.videos
      ? categoryRes.data.videos.map(v => ({
          id: v.id,
          title: v.title,
          event: { id: v.eventId },
        }))
      : [];

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${eventTypeLabel(opt.value)} — Tipmanna Discover`,
    url: getPublicAbsoluteUrl(`/discover/${opt.slug}`),
    description: `Community ${opt.label.toLowerCase()} videos on Tipmanna.`,
    hasPart: categoryItems.slice(0, 12).map((row, index) => {
      const eventId = row?.event?.id;
      const channelId = row?.id;
      const url =
        eventId && channelId
          ? buildContentShareUrl({ eventId, channelId })
          : getPublicAbsoluteUrl(`/discover/${opt.slug}`);
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
        initialDiscoverEvents={catalog.discoverEvents as never[]}
      />
      {categoryItems.length > 0 ? (
        <nav
          aria-label={`${opt.label} video links`}
          className="mx-auto max-w-6xl px-4 pb-8"
        >
          <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            All {opt.label} videos
          </h2>
          <ul className="columns-1 gap-x-6 text-sm sm:columns-2 lg:columns-3">
            {categoryItems.map(item => {
              const eventId = item.event?.id;
              const channelId = item.id;
              if (!eventId || !channelId) return null;
              const href = buildContentShareUrl({ eventId, channelId });
              return (
                <li
                  key={channelId}
                  className="mb-1 break-inside-avoid"
                >
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {item.title ?? "Video"}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
