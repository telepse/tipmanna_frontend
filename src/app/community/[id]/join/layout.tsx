import type { Metadata } from "next";

import { getCommunityAccessStateAction } from "@/actions/communities";
import { buildOrganizationJsonLd } from "@/lib/structured-data";
import { getPublicAbsoluteUrl } from "@/lib/site-config";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const res = await getCommunityAccessStateAction(id);
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
    },
  };
}

export default async function CommunityJoinLayout({ params, children }: Props) {
  const { id } = await params;
  const res = await getCommunityAccessStateAction(id);
  const jp =
    res.success && res.data && typeof res.data === "object"
      ? (
          res.data as {
            joinFormPublic?: {
              name?: string;
              description?: string | null;
              logoUrl?: string | null;
            };
          }
        ).joinFormPublic
      : null;
  const name = jp?.name?.trim() || "Community";
  const joinUrl = getPublicAbsoluteUrl(
    `/community/${encodeURIComponent(id)}/join`
  );
  const orgJsonLd = buildOrganizationJsonLd({
    name,
    description: jp?.description,
    url: joinUrl,
    logo: jp?.logoUrl,
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
