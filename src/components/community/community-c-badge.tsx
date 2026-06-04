import Link from "next/link";
import { cn } from "@/lib/utils";

export type CommunityBadgeInfo = {
  id: string;
  name: string;
};

type Props = {
  community: CommunityBadgeInfo;
  className?: string;
  position?: "top-left" | "top-right";
};

/**
 * Compact “community” chip for video surfaces — links to the community page.
 */
export function CommunityCBadge({
  community,
  className,
  position = "top-left",
}: Props) {
  const pos =
    position === "top-right" ? "right-3 left-auto" : "left-3 right-auto";

  return (
    <Link
      href={`/explore?tab=join&joinCommunity=${encodeURIComponent(community.id)}`}
      title={community.name}
      className={cn(
        "group absolute top-12 z-[55] flex size-7 items-center justify-center rounded-full",
        "from-moonstone-blue bg-gradient-to-br to-white/90 text-sm font-black text-white shadow-lg",
        "ring-2 ring-white/25 transition hover:scale-105 hover:ring-white/50",
        "pointer-events-auto",
        pos,
        className
      )}
      aria-label={`Community: ${community.name}`}
    >
      <span className="drop-shadow-md">C</span>
      <span
        className={cn(
          "pointer-events-none absolute -bottom-8 max-w-[180px] truncate rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white",
          "opacity-0 transition group-hover:opacity-100",
          position === "top-right" ? "right-0" : "left-0"
        )}
      >
        {community.name}
      </span>
    </Link>
  );
}
