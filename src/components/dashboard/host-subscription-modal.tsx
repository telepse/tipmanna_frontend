"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HostSubscriptionPricingPanel } from "@/components/dashboard/host-subscription-pricing-panel";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HOST_SUBSCRIPTION_MODAL_OVERLAY_Z_INDEX,
  HOST_SUBSCRIPTION_MODAL_Z_INDEX,
} from "@/lib/drawer-z-index";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusTier?: "premium" | "community";
  renewLabel?: string;
  title?: string;
  description?: string;
};

export function HostSubscriptionModal({
  open,
  onOpenChange,
  focusTier = "premium",
  renewLabel,
  title = "Choose a host plan",
  description = "Subscribe or renew to unlock Growth and Community features.",
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        overlayClassName={HOST_SUBSCRIPTION_MODAL_OVERLAY_Z_INDEX}
        className={cn(
          HOST_SUBSCRIPTION_MODAL_Z_INDEX,
          "max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <HostSubscriptionPricingPanel
          focusTier={focusTier}
          renewLabel={renewLabel}
          embeddedInModal
        />
      </DialogContent>
    </Dialog>
  );
}

/** Trigger button + modal helper for inline upgrade prompts. */
export function HostSubscriptionUpgradeTrigger({
  focusTier = "premium",
  renewLabel,
  label = "Upgrade plan",
  variant = "default" as const,
  title,
  description,
}: {
  focusTier?: "premium" | "community";
  renewLabel?: string;
  label?: string;
  variant?: "default" | "secondary" | "outline" | "link";
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <HostSubscriptionModal
        open={open}
        onOpenChange={setOpen}
        focusTier={focusTier}
        renewLabel={renewLabel}
        title={title}
        description={description}
      />
    </>
  );
}
