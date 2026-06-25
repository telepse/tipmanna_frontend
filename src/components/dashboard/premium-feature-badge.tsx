import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PremiumFeatureBadge({
  className,
  label = "Host Premium feature",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0"
      aria-label={label}
      title={label}
    >
      <Crown className={cn("text-primary size-4", className)} />
    </span>
  );
}
