/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";

import ExplorePageClient from "@/components/explore/explore-page-client";
import { ExploreDiscoverSeoShell } from "@/components/explore/explore-discover-seo-shell";
import { ExploreSeoJsonLd } from "@/components/explore/explore-seo-jsonld";
import { getPublicAbsoluteUrl } from "@/lib/site-config";

export default async function ExplorePage() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tipmanna",
    url: getPublicAbsoluteUrl("/explore"),
    description:
      "Watch and tip on community clips, live events, and trending videos on Tipmanna TV.",
  };

  const exploreJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Tipmanna TV — Explore",
    url: getPublicAbsoluteUrl("/explore"),
    description:
      "Watch and tip on trending community videos, live events, and creator content.",
    isPartOf: {
      "@type": "WebSite",
      name: "Tipmanna",
      url: getPublicAbsoluteUrl("/"),
    },
  };

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
      <Suspense fallback={null}>
        <ExploreSeoJsonLd />
      </Suspense>
      <Suspense fallback={null}>
        <ExploreDiscoverSeoShell />
      </Suspense>
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] items-center justify-center">
            Loading explore…
          </div>
        }
      >
        <ExplorePageClient />
      </Suspense>
    </>
  );
}
