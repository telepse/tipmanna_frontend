"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  communityId: string;
  joined?: boolean;
  locked?: boolean;
  isAuthenticated: boolean;
  onJoin: (communityId: string) => void;
  onOpen: (communityId: string) => void;
  joinLabel?: string;
  openLabel?: string;
  size?: "sm" | "default";
  className?: string;
};

/** Join (modal) + Open (community page) controls for community list cards. */
export function CommunityJoinOpenControls({
  communityId,
  joined = false,
  locked = false,
  isAuthenticated,
  onJoin,
  onOpen,
  joinLabel,
  openLabel = "Open",
  size = "sm",
  className,
}: Props) {
  if (locked) {
    return (
      <span className="text-muted-foreground text-xs">Awaiting approval</span>
    );
  }

  const resolvedJoinLabel =
    joinLabel ?? (joined ? "Open" : isAuthenticated ? "Join" : "Join");

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <Button
        type="button"
        size={size}
        variant={joined ? "outline" : "secondary"}
        className={cn(
          size === "sm" && "h-7 px-2 text-[11px]",
          !joined && !isAuthenticated && ""
        )}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          if (joined) onOpen(communityId);
          else onJoin(communityId);
        }}
      >
        <span
          className={`${!joined && !isAuthenticated ? "underline underline-offset-2" : ""}`}
        >
          {resolvedJoinLabel}
        </span>
      </Button>
    </div>
  );
}
