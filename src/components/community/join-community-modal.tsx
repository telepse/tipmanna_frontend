"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DRAWER_Z_INDEX } from "@/lib/drawer-z-index";
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
  joinDisabled?: boolean;
};

export function JoinCommunityModal({
  open,
  onOpenChange,
  communityId,
  signInRedirectPath,
  title = "Join community",
  className,
  joinDisabled = false,
}: Props) {
  if (!communityId) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className={cn(
          DRAWER_Z_INDEX,
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
        />
      </DialogContent>
    </Dialog>
  );
}
