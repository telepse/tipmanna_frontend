import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProgramLanding } from "@/components/program/program-landing";
import { fetchGlobalProgramBootstrap } from "@/lib/program-api";
import {
  getPublicAbsoluteUrl,
  getPublicFrontendOrigin,
} from "@/lib/site-config";
import { formatProgramScheduleDisplay } from "@/lib/utils";

type Props = {
  params: Promise<{ enforcementId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { enforcementId } = await params;
  const program = await fetchGlobalProgramBootstrap(enforcementId);
  if (!program) return { title: "Program | Tipmanna" };

  const url = getPublicAbsoluteUrl(`/program/${enforcementId}`);
  const thumb = program.items.find(i => i.thumbnailUrl)?.thumbnailUrl;
  const broadcasterName = program.community?.name ?? "Tipmanna";
  const scheduledLabel = formatProgramScheduleDisplay(program.scheduledAt);
  const title = `${program.title} is live on ${broadcasterName} TV ${scheduledLabel}`;

  return {
    metadataBase: new URL(getPublicFrontendOrigin()),
    title,
    description: `Set a reminder and join viewers around the world for this scheduled community broadcast and realtime shared experience.`,
    openGraph: {
      title,
      description: `Set a reminder and join viewers around the world for this scheduled community broadcast and realtime shared experience.`,
      url,
      type: "website",
      ...(thumb ? { images: [{ url: thumb, width: 1200, height: 630 }] } : {}),
    },
  };
}

export default async function GlobalProgramPage({ params }: Props) {
  const { enforcementId } = await params;
  const program = await fetchGlobalProgramBootstrap(enforcementId);

  if (!program) notFound();

  return (
    <ProgramLanding
      program={program}
      enforcementId={enforcementId}
    />
  );
}
