"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppRouter } from "@/components/navigation/navigation-progress-provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
};

/** Explains dual tipper/host roles and routes to host account creation. */
export function HostUpgradeDialog({ open, onOpenChange, email }: Props) {
  const { push } = useAppRouter();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Continue as a host</DialogTitle>
          <DialogDescription>
            Tipper and host are separate accounts on Tipmanna. You can keep
            tipping as a tipper and create a linked host account to run events
            and upload videos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Stay as tipper
          </Button>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              push(`/sign-up?email=${encodeURIComponent(email)}`);
            }}
          >
            Create host account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
