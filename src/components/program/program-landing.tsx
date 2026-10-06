"use client";

import { ProgramLandingContent } from "@/components/program/program-landing-content";
import type { ProgramBootstrap } from "@/lib/program-types";

export function ProgramLanding({
  program,
  communityId,
  enforcementId,
}: {
  program: ProgramBootstrap;
  communityId?: string;
  enforcementId: string;
}) {
  return (
    <ProgramLandingContent
      program={program}
      communityId={communityId}
      enforcementId={enforcementId}
      variant="page"
    />
  );
}
