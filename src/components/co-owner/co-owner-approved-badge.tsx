import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** When a community badge sits at the default corner, nudge this chip down. */
  stackBelowCommunity?: boolean;
  className?: string;
};

/**
 * Optional surface indicator that co-owner approvals are on file for revenue share.
 */
export function CoOwnerApprovedBadge({
  stackBelowCommunity,
  className,
}: Props) {
  return (
    <div
      title="Co-owner revenue share is approved for this video"
      className={cn(
        "pointer-events-none absolute right-3 z-[54] flex items-center gap-1 rounded-full",
        "bg-emerald-700/95 px-2 py-1 text-[10px] font-semibold text-white shadow-md ring-1 ring-white/30",
        stackBelowCommunity ? "top-[5.25rem]" : "top-3",
        className
      )}
    >
      <BadgeCheck
        className="size-3.5 shrink-0"
        aria-hidden
      />
      <span>Co-owner</span>
    </div>
  );
}
