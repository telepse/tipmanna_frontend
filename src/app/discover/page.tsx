export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";

// Local imports
import { DiscoverPageClient } from "@/components/discover/discover-page-client";
import { loadDiscoverCatalogServer } from "@/lib/discover-catalog-server";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { safeJsonLdStringify } from "@/lib/json-ld-safe";

export const metadata: Metadata = {
  title: "Discover creators, programs, and live streams on Tipmanna",
  description:
    "Browse top content, latest videos, spotlight picks, programs, and live streams across Tipmanna.",
};

export default async function DiscoverPage() {
  const catalog = await loadDiscoverCatalogServer();

  const pageDescription =
    "Browse top content, latest videos, spotlight picks, programs, and live streams across Tipmanna.";

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tipmanna Discover",
    url: getPublicAbsoluteUrl("/discover"),
    description: pageDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${getPublicAbsoluteUrl("/discover")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(websiteJsonLd) }}
      />
      <Suspense fallback={null}>
        <DiscoverPageClient
          initialContents={catalog.contents as never[]}
          initialLatest={catalog.latest as never[]}
          initialSpotlight={catalog.spotlight as never[]}
          initialRecommended={catalog.recommended as never[]}
          initialMostTipped={catalog.mostTipped as never[]}
          initialPrograms={catalog.programs as never[]}
          initialLiveStreams={catalog.liveStreams as never}
          initialTippers={catalog.tippers as never[]}
          initialTopCommunities={catalog.topCommunities as never[]}
          initialPlaylists={catalog.playlists as never[]}
          initialDiscoverEvents={catalog.discoverEvents as never[]}
        />
      </Suspense>
    </>
  );
}
