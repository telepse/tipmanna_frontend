"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DRAWER_OVERLAY_Z_INDEX,
  DRAWER_Z_INDEX,
} from "@/lib/drawer-z-index";
import { cn } from "@/lib/utils";
import { CommunityHowToJoinSection } from "@/components/community/community-how-to-join-section";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  /** Full path + query for sign-in redirect. */
  signInRedirectPath: string;
  title?: string;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  signInOverlayClassName?: string;
  signInContentClassName?: string;
  joinDisabled?: boolean;
  onJoined?: () => void;
};

export function JoinCommunityModal({
  open,
  onOpenChange,
  communityId,
  signInRedirectPath,
  title = "Join community",
  className,
  overlayClassName = DRAWER_OVERLAY_Z_INDEX,
  contentClassName = DRAWER_Z_INDEX,
  signInOverlayClassName,
  signInContentClassName,
  joinDisabled = false,
  onJoined,
}: Props) {
  if (!communityId) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn(
          contentClassName,
          "max-h-[85vh] overflow-y-auto sm:max-w-lg",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <CommunityHowToJoinSection
          communityId={communityId}
          signInRedirectPath={signInRedirectPath}
          showCancelLink={false}
          showMemberInfo
          joinDisabled={joinDisabled}
          onJoined={onJoined}
          signInOverlayClassName={signInOverlayClassName}
          signInContentClassName={signInContentClassName}
        />
      </DialogContent>
    </Dialog>
  );
}
