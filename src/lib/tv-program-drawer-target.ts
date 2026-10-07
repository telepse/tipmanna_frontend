export type TvProgramDrawerTarget = {
  enforcementId: string;
  communityId: string | null;
};

export function toProgramDrawerTarget(program: {
  id: string;
  communityId?: string | null;
}): TvProgramDrawerTarget {
  return {
    enforcementId: program.id,
    communityId: program.communityId ?? null,
  };
}
