import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProgramLanding } from "@/components/program/program-landing";
import { fetchCommunityProgramBootstrap } from "@/lib/program-api";
import {
  getPublicAbsoluteUrl,
  getPublicFrontendOrigin,
} from "@/lib/site-config";
import { formatProgramScheduleDisplay } from "@/lib/utils";
import { buildBroadcastEventJsonLd } from "@/lib/structured-data";

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
  const broadcasterName = program.community?.name ?? "Tipmanna";
  const scheduledLabel = formatProgramScheduleDisplay(program.scheduledAt);
  const title = `${program.title} is live on ${broadcasterName} TV ${scheduledLabel} 📅⚡`;

  return {
    metadataBase: new URL(getPublicFrontendOrigin()),
    title: `${program.title} | ${program.community?.name ?? "Community"}`,
    description: `Watch ${program.title} on Tipmanna.`,
    openGraph: {
      title,
      description:
        "Set a reminder and join viewers around the world for this scheduled community broadcast and realtime shared experience.",
      url,
      type: "website",
      ...(thumb ? { images: [{ url: thumb, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: thumb ? "summary_large_image" : "summary",
      title,
      description:
        "Set a reminder and join viewers around the world for this scheduled community broadcast and realtime shared experience.",
      ...(thumb ? { images: [thumb] } : {}),
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

  const broadcastJsonLd = buildBroadcastEventJsonLd({
    title: program.title,
    startDate: program.scheduledAt,
    url: getPublicAbsoluteUrl(
      `/c/${communityId}/program/${enforcementId}`
    ),
    image: program.items.find(i => i.thumbnailUrl)?.thumbnailUrl ?? null,
    organizerName: program.community?.name ?? "Community TV",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(broadcastJsonLd) }}
      />
      <ProgramLanding
        program={program}
        communityId={communityId}
        enforcementId={enforcementId}
      />
    </>
  );
}
