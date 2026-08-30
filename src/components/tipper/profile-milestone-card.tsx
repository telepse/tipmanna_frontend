"use client";

import { Star } from "lucide-react";
import { Paragraph } from "../shared/paragraph";

type MilestoneStatus = "locked" | "unlocked";

interface ProfileMilestoneCardProps {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: MilestoneStatus;
  totalTippedAmount?: number;
  extraInfo?: number; // number of times milestone achieved
}

export const ProfileMilestoneCard = ({
  id,
  title,
  description,
  progress,
  status,
  extraInfo = 0,
}: ProfileMilestoneCardProps) => {
  // Build display title for milestones with multiple achievements
  const displayTitle =
    id === "tipper_100" && extraInfo > 1 ? `${title} * ${extraInfo}` : title;

  return (
    <div
      className={`border-primary relative rounded-md border p-4 backdrop-blur-md ${
        status === "unlocked" ? "bg-secondary/20" : "!bg-white opacity-50"
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-start gap-2">
          <div
            className={`border-primary flex size-10 shrink-0 items-center justify-center rounded-full border ${
              status === "unlocked"
                ? "bg-primary text-white/80"
                : "text-primary bg-white"
            }`}
          >
            <Star className="size-6" />
          </div>
          <div>
            <Paragraph
              size="sm"
              weight="bold"
            >
              {displayTitle}
            </Paragraph>
            <Paragraph
              size="xs"
              color="muted"
            >
              {description}
            </Paragraph>
          </div>
        </div>

        {/* Status */}
        <span
          className={`open_sans z-10 w-20 rounded-md px-3 py-1 text-center text-xs font-semibold ${
            status === "unlocked"
              ? "bg-black text-white !opacity-100"
              : "bg-gray-300 text-black !opacity-100"
          }`}
          style={{ zIndex: 100 }}
        >
          {status === "unlocked" ? "Unlocked" : "Locked"}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mt-2 h-2 w-full rounded-md bg-gray-300">
          <div
            className={`h-2 rounded-md ${progress > 0 ? "bg-primary" : "bg-gray-300"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <Paragraph
          size="xs"
          color="muted"
        >
          {progress.toFixed(2)}% Complete
        </Paragraph>
      </div>
    </div>
  );
};
