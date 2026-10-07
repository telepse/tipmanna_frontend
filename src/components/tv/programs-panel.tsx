"use client";

import {
  formatProgramScheduleDisplay,
  getStatusColor,
  trimTitle,
} from "@/lib/utils";
import type { TvProgramDrawerTarget } from "@/lib/tv-program-drawer-target";
import { toProgramDrawerTarget } from "@/lib/tv-program-drawer-target";
import type { DiscoveryProgram } from "@/types/program.types";

export const PROGRAM_DISPLAY_TIMEZONE = "UK";

type ProgramsPanelProps = {
  programs: DiscoveryProgram[];
  onSelectProgram: (target: TvProgramDrawerTarget) => void;
};

export const ProgramsPanel = ({
  programs,
  onSelectProgram,
}: ProgramsPanelProps) => {
  if (!programs.length) {
    return (
      <div className="space-y-4">
        <h5 className="font-semibold">Programs</h5>

        <div className="text-muted-foreground text-sm">
          No programs available.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h5 className="font-semibold">Programs</h5>

      {programs.map(program => (
        <div
          key={program.id}
          className="border-primary w-full rounded-md border-2 px-2 py-1"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h5 className="flex gap-2">
                <button
                  type="button"
                  className="text-left text-sm hover:underline"
                  onClick={() =>
                    onSelectProgram(toProgramDrawerTarget(program))
                  }
                >
                  {trimTitle(program.title, 25)}
                </button>
              </h5>

              <span className={getStatusColor(program.programStatus)}>
                {program.programStatus}
              </span>
            </div>

            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <p className="flex items-center gap-1 text-[10px]">
                <span>
                  Time: {formatProgramScheduleDisplay(program.scheduledAt)}
                </span>

                <span>({PROGRAM_DISPLAY_TIMEZONE})</span>
              </p>

              <span className="text-[10px]">{program.communityName}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
