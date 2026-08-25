"use client";

import Link from "next/link";
import { Crown, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";

export function HostSubscriptionQuickLinks({
  eventSlug,
}: {
  eventSlug: string | undefined;
}) {
  const { status, hasActivePremium, isLoading } = useHostPlanCapabilities();

  if (!eventSlug || isLoading) return null;

  const subtitle = hasActivePremium
    ? "Premium features are active on your account."
    : status === "lapsed"
      ? "Your subscription has lapsed — renew to restore premium controls."
      : "Subscribe to unlock video display toggles, tip layout, and more.";

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium">Host plans</p>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-w-0 flex-1"
        >
          <Link
            href={`/host/${eventSlug}/host-premium`}
            className="flex min-w-0 items-center justify-center gap-1.5"
          >
            <Crown className="size-4" />
            Host Premium
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-w-0 flex-1"
        >
          <Link
            href={`/host/${eventSlug}/host-community`}
            className="flex min-w-0 items-center justify-center gap-1.5"
          >
            <Users className="size-4" />
            Host Community
          </Link>
        </Button>
      </div>
    </div>
  );
}
