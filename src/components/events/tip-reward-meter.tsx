"use client";

import { cn } from "@/lib/utils";
import {
  GALAXY_MIN_AMOUNT_GBP,
  TURBO_MIN_DISTINCT_STYLES,
  type TipRewardEligibility,
} from "@/lib/tip-reward-eligibility";

type Props = {
  eligibility: TipRewardEligibility;
  className?: string;
};

export function TipRewardMeter({ eligibility, className }: Props) {
  const { distinctStyleCount, totalGbp, rewardTurbo, rewardGalaxy } =
    eligibility;

  const styleProgress = Math.min(
    1,
    distinctStyleCount / TURBO_MIN_DISTINCT_STYLES
  );
  const amountProgress = Math.min(1, totalGbp / GALAXY_MIN_AMOUNT_GBP);

  return (
    <div
      className={cn("border-border/60 flex gap-1.5 border-t", className)}
      aria-label="Reward progress"
    >
      {/* <div className="grid w-full grid-cols-3 gap-2"> */}
      {/* Reward turbo */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] sm:text-[11px]">
          <span>Turbo ({TURBO_MIN_DISTINCT_STYLES} styles)</span>
          <span className={cn(rewardTurbo ? "text-success font-semibold" : "")}>
            {rewardTurbo
              ? "Unlocked"
              : `${distinctStyleCount}/${TURBO_MIN_DISTINCT_STYLES}`}
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              rewardTurbo ? "bg-success" : "bg-moonstone-blue"
            )}
            style={{ width: `${styleProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Reward galaxy */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] sm:text-[11px]">
          <span>Galaxy (£{GALAXY_MIN_AMOUNT_GBP}+)</span>
          <span
            className={cn(rewardGalaxy ? "text-success font-semibold" : "")}
          >
            {rewardGalaxy
              ? "Unlocked"
              : `£${totalGbp.toFixed(0)}/£${GALAXY_MIN_AMOUNT_GBP}`}
          </span>
        </div>
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              rewardGalaxy ? "bg-success" : "bg-moonstone-blue/80"
            )}
            style={{ width: `${amountProgress * 100}%` }}
          />
        </div>
      </div>
      {/* </div> */}
    </div>
  );
}
