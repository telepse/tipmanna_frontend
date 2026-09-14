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
    joinLabel ??
    (joined ? "Open" : isAuthenticated ? "Join" : "Sign in to join");

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <Button
        type="button"
        size={size}
        variant={joined ? "outline" : "secondary"}
        className={cn(size === "sm" && "h-7 px-2 text-[11px]")}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          if (joined) onOpen(communityId);
          else onJoin(communityId);
        }}
      >
        {resolvedJoinLabel}
      </Button>
      <Button
        type="button"
        size={size}
        variant="ghost"
        className={cn(size === "sm" && "h-7 w-7 px-0")}
        aria-label={openLabel}
        title={openLabel}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onOpen(communityId);
        }}
      >
        <ExternalLink className="size-3.5" />
      </Button>
    </div>
  );
}
