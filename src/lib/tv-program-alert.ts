/** Program list row shape used on the TV Programs tab. */
export type TvProgramAlertRow = {
  programStatus?: string | null;
};

export function hasUpcomingProgramAlert(
  programs: readonly TvProgramAlertRow[]
): boolean {
  return programs.some(p => p.programStatus === "Not started");
}
