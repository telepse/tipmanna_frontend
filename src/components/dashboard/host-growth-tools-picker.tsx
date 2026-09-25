"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PremiumFeatureBadge } from "@/components/dashboard/premium-feature-badge";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";
import {
  buildHostPremiumHref,
  type HostPremiumTab,
} from "@/lib/host-dashboard-shortcuts";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";

type Props = {
  hostEventSlug: string | null;
  subscriptionPrompt?: HostSubscriptionPromptFns;
  size?: "sm" | "default";
  className?: string;
};

const GROWTH_ITEMS: { label: string; tab: HostPremiumTab }[] = [
  { label: "Playlists", tab: "playlist" },
  { label: "Event room access control", tab: "event_room_access_control" },
  { label: "Video co-owner", tab: "video_coowners" },
  { label: "Video requests", tab: "video_requests" },
  { label: "Advanced video analytics", tab: "advanced_video_analytics" },
];

export function HostGrowthToolsPicker({
  hostEventSlug,
  subscriptionPrompt,
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const { hasActivePremium, status, isLoading } = useHostPlanCapabilities();
  const localPrompt = useHostSubscriptionPrompt({ focusTier: "premium" });
  const { openForRequired, openForLapsed } = subscriptionPrompt ?? localPrompt;

  const videoRequestsOn =
    process.env.NEXT_PUBLIC_VIDEO_REQUESTS_ENABLED !== "false";
  const items = GROWTH_ITEMS.filter(
    i => i.tab !== "video_requests" || videoRequestsOn
  );

  const showLock = !isLoading && !hasActivePremium;

  const openLocked = () => {
    if (isLoading || !hostEventSlug) return;
    const returnPath = `/host/${hostEventSlug}/host-premium`;
    setHostSubscriptionResume({ kind: "return-path", returnPath });
    if (status === "lapsed") {
      openForLapsed("premium");
    } else {
      openForRequired("premium");
    }
  };

  const navigate = (tab: HostPremiumTab) => {
    if (!hostEventSlug) return;
    router.push(buildHostPremiumHref(hostEventSlug, tab));
  };

  if (!hasActivePremium) {
    return (
      <>
        <Button
          type="button"
          size={size}
          variant="outline"
          className={className}
          disabled={!hostEventSlug || isLoading}
          onClick={openLocked}
        >
          {showLock ? (
            <PremiumFeatureBadge
              className="size-3.5"
              label="Requires Host Growth — tap to subscribe or renew"
            />
          ) : null}
          Growth tools
        </Button>
        {!subscriptionPrompt ? localPrompt.SubscriptionPromptModal : null}
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size={size}
          variant="outline"
          className={className}
          disabled={!hostEventSlug || isLoading}
        >
          Growth tools
          <ChevronDown className="ml-1 size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map(item => (
          <DropdownMenuItem
            key={item.tab}
            onClick={() => navigate(item.tab)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
