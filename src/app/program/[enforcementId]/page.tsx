import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Third-party imports
import dayjs from "dayjs";

import { ProgramLanding } from "@/components/program/program-landing";
import { fetchGlobalProgramBootstrap } from "@/lib/program-api";
import {
  getPublicAbsoluteUrl,
  getPublicFrontendOrigin,
} from "@/lib/site-config";

type Props = {
  params: Promise<{ enforcementId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { enforcementId } = await params;
  const program = await fetchGlobalProgramBootstrap(enforcementId);
  if (!program) return { title: "Program | Tipmanna" };

  const url = getPublicAbsoluteUrl(`/program/${enforcementId}`);
  const thumb = program.items.find(i => i.thumbnailUrl)?.thumbnailUrl;

  return {
    metadataBase: new URL(getPublicFrontendOrigin()),
    title: `${program.title} | Tipmanna TV`,
    description: `Watch ${program.title} on Tipmanna TV.`,
    openGraph: {
      title: program.title,
      description: `Scheduled ${new Date(program.scheduledAt).toLocaleString()}`,
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
