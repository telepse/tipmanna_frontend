"use client";

import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { pushOptInPrimaryButtonLabel } from "@/lib/push-opt-in-ios";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  isGuestFlow: boolean;
  onEnablePush: () => void | Promise<void>;
  onEmailInAppOnly: () => void | Promise<void>;
};

export function EventReminderChoiceDialog({
  open,
  onOpenChange,
  email,
  isGuestFlow,
  onEnablePush,
  onEmailInAppOnly,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Reminder set
          </DialogTitle>
          <DialogDescription>
            {isGuestFlow
              ? `You will get an email before the event starts. Sign in to also receive in-app updates if the event schedule changes.`
              : `Choose how you want to be notified before the event and if the schedule changes.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="bg-black"
            onClick={() => void onEnablePush()}
          >
            {pushOptInPrimaryButtonLabel({ needsSignIn: isGuestFlow })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void onEmailInAppOnly()}
          >
            Email + in-app
          </Button>
        </div>
        {email ? (
          <p className="text-muted-foreground text-xs">
            Reminder email: <strong>{email}</strong>
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
