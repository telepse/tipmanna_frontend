import { cn } from "@/lib/utils";

export function TvProgramsTabAlertDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("bg-primary size-2 shrink-0 rounded-full", className)}
    />
  );
}
