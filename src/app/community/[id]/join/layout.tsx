import type { Metadata } from "next";

import { getCommunityAccessStateAction } from "@/actions/communities";
import {
  buildCommunityJoinMetadata,
  buildCommunityMetaDescription,
} from "@/lib/creator-profile-metadata";
import { buildOrganizationJsonLd } from "@/lib/structured-data";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { safeJsonLdStringify } from "@/lib/json-ld-safe";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

type JoinFormPublic = {
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  totalTips?: number;
  memberCount?: number;
  numVideos?: number;
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const joinForm = await loadJoinFormPublic(id);
  const name = joinForm?.name?.trim() || "Community";
  const description = buildCommunityMetaDescription({
    name,
    memberCount: joinForm?.memberCount,
    totalTips: joinForm?.totalTips,
    numVideos: joinForm?.numVideos,
    description: joinForm?.description,
  });

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
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(orgJsonLd) }}
      />
      {children}
    </>
  );
}
