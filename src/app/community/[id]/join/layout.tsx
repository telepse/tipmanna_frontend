import type { Metadata } from "next";

import { getCommunityAccessStateAction } from "@/actions/communities";
import {
  OG_SQUARE_IMAGE_SIZE,
  toAbsoluteMediaUrl,
  toOgSquareImageUrl,
} from "@/lib/creator-profile-metadata";
import { buildOrganizationJsonLd } from "@/lib/structured-data";
import { getPrimaryOrigin, getPublicAbsoluteUrl } from "@/lib/site-config";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

type JoinFormPublic = {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
};

async function loadJoinFormPublic(id: string): Promise<JoinFormPublic | null> {
  const res = await getCommunityAccessStateAction(id);
  if (!res.success || !res.data || typeof res.data !== "object") {
    return null;
  }

  return (
    (
      res.data as {
        joinFormPublic?: JoinFormPublic;
      }
    ).joinFormPublic ?? null
  );
}

function buildCommunityJoinMetadata(input: {
  id: string;
  name: string;
  description: string;
  logoUrl?: string | null;
}): Metadata {
  const pageUrl = getPublicAbsoluteUrl(
    `/community/${encodeURIComponent(input.id)}/join`
  );
  const title = `Join ${input.name} community on | Tipmanna`;
  const absoluteLogoUrl = toAbsoluteMediaUrl(input.logoUrl);
  const ogLogoUrl = absoluteLogoUrl
    ? toOgSquareImageUrl(absoluteLogoUrl)
    : null;

  return {
    metadataBase: new URL(getPrimaryOrigin()),
    title,
    description: input.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description: input.description,
      url: pageUrl,
      siteName: "Tipmanna",
      type: "website",
      ...(ogLogoUrl
        ? {
            images: [
              {
                url: ogLogoUrl,
                width: OG_SQUARE_IMAGE_SIZE,
                height: OG_SQUARE_IMAGE_SIZE,
                alt: `${input.name} logo`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      ...(ogLogoUrl ? { images: [ogLogoUrl] } : {}),
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const joinForm = await loadJoinFormPublic(id);
  const name = joinForm?.name?.trim() || "Community";
  const description =
    joinForm?.description?.trim() ||
    "Join this community on Tipmanna TV to watch exclusive clips and connect with members.";

  return buildCommunityJoinMetadata({
    id,
    name,
    description,
    logoUrl: joinForm?.logoUrl,
  });
}

export default async function CommunityJoinLayout({ params, children }: Props) {
  const { id } = await params;
  const joinForm = await loadJoinFormPublic(id);
  const name = joinForm?.name?.trim() || "Community";
  const joinUrl = getPublicAbsoluteUrl(
    `/community/${encodeURIComponent(id)}/join`
  );
  const orgJsonLd = buildOrganizationJsonLd({
    name,
    description: joinForm?.description,
    url: joinUrl,
    logo: joinForm?.logoUrl,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {children}
    </>
  );
}
