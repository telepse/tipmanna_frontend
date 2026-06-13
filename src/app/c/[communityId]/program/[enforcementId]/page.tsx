import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProgramLanding } from "@/components/program/program-landing";
import { fetchCommunityProgramBootstrap } from "@/lib/program-api";
import {
  getPublicAbsoluteUrl,
  getPublicFrontendOrigin,
} from "@/lib/site-config";

type Props = {
  params: Promise<{ communityId: string; enforcementId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId, enforcementId } = await params;
  const program = await fetchCommunityProgramBootstrap(
    communityId,
    enforcementId
  );

  if (!program) return { title: "Program | Tipmanna" };

  const url = getPublicAbsoluteUrl(
    `/c/${communityId}/program/${enforcementId}`
  );
  const thumb = program.items.find(i => i.thumbnailUrl)?.thumbnailUrl;

  return {
    metadataBase: new URL(getPublicFrontendOrigin()),
    title: `${program.title} | ${program.community?.name ?? "Community"}`,
    description: `Watch ${program.title} on Tipmanna.`,
    openGraph: {
      title: `${program.title} is live on ${program.community?.name} TV 📅`,
      description:
        "Set a reminder and join viewers around the world for this scheduled community broadcast and realtime shared experience.",
      url,
      type: "website",
      ...(thumb ? { images: [{ url: thumb, width: 1200, height: 630 }] } : {}),
    },
  };
}

export default async function CommunityProgramPage({ params }: Props) {
  const { communityId, enforcementId } = await params;
  const program = await fetchCommunityProgramBootstrap(
    communityId,
    enforcementId
  );
  if (!program) notFound();

  return (
    <ProgramLanding
      program={program}
      communityId={communityId}
      enforcementId={enforcementId}
    />
  );
}
