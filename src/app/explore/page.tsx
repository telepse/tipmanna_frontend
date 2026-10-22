export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";

import ExplorePageClient from "@/components/explore/explore-page-client";
import { ExploreDiscoverSeoGate } from "@/components/explore/explore-discover-seo-gate";
import { ExploreSsrBootStream } from "@/components/explore/explore-ssr-boot-stream";
import { getCommunityAccessStateAction } from "@/actions/communities";
import {
  E2E_JOIN_COMMUNITY_ID,
  E2E_JOIN_FORM_PUBLIC,
} from "@/lib/e2e-explore-fixtures";
import { isExploreE2eFixturesEnabled } from "@/lib/explore-e2e-fixtures-gate";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { safeJsonLdStringify } from "@/lib/json-ld-safe";

function exploreSearchParamsKey(
  sp: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    }
  }
  return params.toString();
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const joinRaw = sp.joinCommunity;
  const joinId = (
    typeof joinRaw === "string" ? joinRaw : (joinRaw?.[0] ?? "")
  ).trim();
  const tab = typeof sp.tab === "string" ? sp.tab : sp.tab?.[0];
  if (tab !== "join" || !joinId) {
    return {
      title: "Tipmanna TV — Explore",
      description:
        "Watch and tip on trending community videos, live events, and creator content.",
    };
  }

  const searchParamsKey = exploreSearchParamsKey(sp);
  if (
    joinId === E2E_JOIN_COMMUNITY_ID &&
    isExploreE2eFixturesEnabled(searchParamsKey)
  ) {
    const name = E2E_JOIN_FORM_PUBLIC.name;
    const description =
      E2E_JOIN_FORM_PUBLIC.description?.trim() ||
      "Join this community on Tipmanna TV to watch exclusive clips and connect with members.";
    return {
      title: `Join ${name} on Tipmanna`,
      description,
      openGraph: {
        title: `Join ${name} on Tipmanna`,
        description,
        url: getPublicAbsoluteUrl(
          `/explore?tab=join&joinCommunity=${encodeURIComponent(joinId)}&e2e=1`
        ),
      },
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
  const searchParamsKey = exploreSearchParamsKey(sp);
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
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(exploreJsonLd) }}
      />
      <Suspense fallback={null}>
        <ExploreSsrBootStream searchParamsKey={searchParamsKey} />
      </Suspense>
      <Suspense fallback={null}>
        <ExploreDiscoverSeoGate
          tab={typeof sp.tab === "string" ? sp.tab : undefined}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ExplorePageClient ssrBoot={null} />
      </Suspense>
    </>
  );
}
