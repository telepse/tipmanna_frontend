"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityName: string;
  communityLogoUrl?: string;
  actionLabel?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** Confirm leaving dedicated mode before switching community/TV source. */
export function DedicatedExitConfirmDialog({
  open,
  onOpenChange,
  communityName,
  communityLogoUrl,
  actionLabel = "Leave dedicated mode",
  busy = false,
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave dedicated community mode?</DialogTitle>
          <DialogDescription>
            This leaves dedicated mode for{" "}
            <span className="text-foreground font-medium">{communityName}</span>
            . Tipmanna Public and your other feed settings will be restored.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "Working…" : actionLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
