export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";

import ExplorePageClient from "@/components/explore/explore-page-client";
import { ExploreDiscoverSeoGate } from "@/components/explore/explore-discover-seo-gate";
import { ExploreSsrBootStream } from "@/components/explore/explore-ssr-boot-stream";
import { getCommunityAccessStateAction } from "@/actions/communities";
import { getPublicAbsoluteUrl } from "@/lib/site-config";

type PageProps = {
  searchParams: Promise<{ tab?: string; joinCommunity?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const joinId = sp.joinCommunity?.trim();
  if (sp.tab !== "join" || !joinId) {
    return {
      title: "Tipmanna TV — Explore",
      description:
        "Watch and tip on trending community videos, live events, and creator content.",
    };
  }

  const res = await getCommunityAccessStateAction(joinId);
  const jp =
    res.success && res.data && typeof res.data === "object"
      ? (
          res.data as {
            joinFormPublic?: { name?: string; description?: string | null };
          }
        ).joinFormPublic
      : null;
  const name = jp?.name?.trim() || "Community";
  const description =
    jp?.description?.trim() ||
    "Join this community on Tipmanna TV to watch exclusive clips and connect with members.";

  return {
    title: `Join ${name} on Tipmanna`,
    description,
    openGraph: {
      title: `Join ${name} on Tipmanna`,
      description,
      url: getPublicAbsoluteUrl(
        `/explore?tab=join&joinCommunity=${encodeURIComponent(joinId)}`
      ),
    },
  };
}

export default async function ExplorePage({ searchParams }: PageProps) {
  const sp = await searchParams;
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
        <ExploreSsrBootStream />
      </Suspense>
      <Suspense fallback={null}>
        <ExploreDiscoverSeoGate tab={sp.tab} />
      </Suspense>
      <Suspense fallback={null}>
        <ExplorePageClient ssrBoot={null} />
      </Suspense>
    </>
  );
}
