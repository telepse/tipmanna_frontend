"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settingsUrl: string;
  profileLabel?: string;
};

export function IncompleteProfilePayoutModal({
  open,
  onOpenChange,
  settingsUrl,
  profileLabel = "profile",
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete your profile first</DialogTitle>
          <DialogDescription>
            You need to complete your host {profileLabel} on the Host settings
            tab before you can access payouts. This helps us process your
            earnings correctly.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            asChild
          >
            <Link href={settingsUrl}>Go to host settings</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
