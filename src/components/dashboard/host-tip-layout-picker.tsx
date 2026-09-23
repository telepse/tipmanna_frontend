"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PremiumFeatureBadge } from "@/components/dashboard/premium-feature-badge";
import {
  HostEventRoomPickerDialog,
  type HostEventRoomOption,
} from "@/components/dashboard/host-event-room-picker-dialog";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";
import { useApprovedHostEvents } from "@/lib/use-approved-host-events";
import { buildTipLayoutHref } from "@/lib/host-dashboard-shortcuts";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";

type Props = {
  hostEventSlug: string | null;
  subscriptionPrompt?: HostSubscriptionPromptFns;
  size?: "sm" | "default";
  className?: string;
};

export function HostTipLayoutPicker({
  hostEventSlug,
  subscriptionPrompt,
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { hasActivePremium, capabilities, status, isLoading } =
    useHostPlanCapabilities();
  const localPrompt = useHostSubscriptionPrompt({ focusTier: "premium" });
  const { openForRequired, openForLapsed } =
    subscriptionPrompt ?? localPrompt;
  const { events, loading, error } = useApprovedHostEvents(open);

  const showLock = !isLoading && !hasActivePremium;

  const onOpen = () => {
    if (isLoading || !hostEventSlug) return;
    setOpen(true);
  };

  const onSelect = (ev: HostEventRoomOption) => {
    if (!hostEventSlug) return;
    const href = buildTipLayoutHref(hostEventSlug, ev.id);
    if (capabilities.accessTipLayout && hasActivePremium) {
      setOpen(false);
      router.push(href);
      return;
    }
    setHostSubscriptionResume({ kind: "return-path", returnPath: href });
    setOpen(false);
    if (status === "lapsed") openForLapsed("premium");
    else openForRequired("premium");
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant="outline"
        className={className}
        disabled={!hostEventSlug || isLoading}
        onClick={onOpen}
      >
        {showLock ? (
          <PremiumFeatureBadge
            className="size-3.5"
            label="Requires Host Growth — tap to subscribe or renew"
          />
        ) : null}
        Tip layout
      </Button>
      {open ? (
        <HostEventRoomPickerDialog
          open={open}
          onOpenChange={setOpen}
          title="Customize tip layout"
          events={events}
          loading={loading}
          error={error}
          onSelect={onSelect}
        />
      ) : null}
      {!subscriptionPrompt ? localPrompt.SubscriptionPromptModal : null}
    </>
  );
}
