"use client";

import { Flame, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  GALAXY_ICON_COUNT,
  GALAXY_MIN_AMOUNT_GBP,
  TURBO_MIN_DISTINCT_STYLES,
  displayGalaxyAmountGbp,
  displayTurboStyleCount,
  isGalaxyIconFilled,
  isTurboIconFilled,
  type TipRewardEligibility,
} from "@/lib/tip-reward-eligibility";

type IconProps = {
  eligibility: TipRewardEligibility;
  className?: string;
  iconClassName?: string;
};

export function TipRewardTurboIcons({
  eligibility,
  className,
  iconClassName = "size-4",
}: IconProps) {
  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={`Turbo progress: ${displayTurboStyleCount(eligibility.distinctStyleCount)} of ${TURBO_MIN_DISTINCT_STYLES} styles`}
    >
      {Array.from({ length: TURBO_MIN_DISTINCT_STYLES }, (_, i) => i + 1).map(
        index => (
          <Flame
            key={index}
            className={cn(
              iconClassName,
              isTurboIconFilled(index, eligibility)
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            )}
          />
        )
      )}
    </div>
  );
}

export function TipRewardGalaxyIcons({
  eligibility,
  className,
  iconClassName = "size-4",
}: IconProps) {
  return (
    <div
      className={cn("flex items-center", className)}
      aria-label={`Galaxy progress: £${displayGalaxyAmountGbp(eligibility.totalGbp).toFixed(0)} of £${GALAXY_MIN_AMOUNT_GBP}`}
    >
      {Array.from({ length: GALAXY_ICON_COUNT }, (_, index) => (
        <Sparkles
          key={index}
          className={cn(
            iconClassName,
            isGalaxyIconFilled(index, eligibility)
              ? "fill-moonstone-blue text-moonstone-blue"
              : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}

type Props = {
  eligibility: TipRewardEligibility;
  className?: string;
};

export function TipRewardMeter({ eligibility, className }: Props) {
  const { distinctStyleCount, totalGbp } = eligibility;
  const turboDisplayCount = displayTurboStyleCount(distinctStyleCount);
  const galaxyDisplayAmount = displayGalaxyAmountGbp(totalGbp);

  return (
    <div
      className={cn(
        "border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-2",
        className
      )}
      aria-label="Reward progress"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 text-[10px] sm:text-[11px]">
          <span className="whitespace-nowrap">
            Turbo ({turboDisplayCount}/{TURBO_MIN_DISTINCT_STYLES} styles)
          </span>
          {/* {rewardTurbo ? (
            <span className="text-success ml-1 font-semibold">Unlocked</span>
          ) : null} */}
        </div>
        <TipRewardTurboIcons eligibility={eligibility} />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <TipRewardGalaxyIcons eligibility={eligibility} />
        <div className="min-w-0 text-right text-[10px] sm:text-[11px]">
          <span className="whitespace-nowrap">
            Galaxy (£{galaxyDisplayAmount.toFixed(0)}/£{GALAXY_MIN_AMOUNT_GBP})
          </span>
          {/* {rewardGalaxy ? (
            <span className="text-success ml-1 font-semibold">Unlocked</span>
          ) : null} */}
        </div>
      </div>
    </div>
  );
}
