"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Third-party imports
import { MoveUpRight } from "lucide-react";

// Local imports
import { getDiscoveryProgramsAction } from "@/actions/contents";
import { Program } from "@/types/program.types";
import {
  formatProgramScheduleDisplay,
  getStatusColor,
  trimTitle,
} from "@/lib/utils";

export const PROGRAM_DISPLAY_TIMEZONE = "UK";

type ProgramsPanelProps = {
  programs: Program[];
};

export const ProgramsPanel = ({ programs }: ProgramsPanelProps) => {
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
                <Link
                  href={program.landingUrl}
                  className="text-sm"
                  target="_blank"
                >
                  {trimTitle(program.title, 25)}
                </Link>
                <MoveUpRight className="size-4" />
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
