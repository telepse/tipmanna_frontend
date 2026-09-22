import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommunityFeatureBadge({
  className,
  label = "Host Community feature",
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
      <Users className={cn("text-primary size-4", className)} />
    </span>
  );
}
