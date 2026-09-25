"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommunityFeatureBadge } from "@/components/dashboard/community-feature-badge";
import { HostCommunityPickerDialog } from "@/components/dashboard/host-community-picker-dialog";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";
import {
  buildCommunityAnalyticsHref,
  buildCommunityCustomizationHref,
  buildCommunityTvHref,
  buildHostCommunityHref,
  type HostCommunityMainTab,
} from "@/lib/host-dashboard-shortcuts";
import { useOwnedCommunitiesPicker } from "@/lib/use-owned-communities-picker";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";

type Props = {
  hostEventSlug: string | null;
  subscriptionPrompt?: HostSubscriptionPromptFns;
  size?: "sm" | "default";
  className?: string;
};

type CommunityAction =
  | { type: "communityTab"; tab: HostCommunityMainTab }
  | { type: "branding" }
  | { type: "analytics" }
  | { type: "tvSchedule" };

export function HostCommunityToolsPicker({
  hostEventSlug,
  subscriptionPrompt,
  size = "sm",
  className,
}: Props) {
  const router = useRouter();
  const communityFeatureOn =
    process.env.NEXT_PUBLIC_COMMUNITY_FEATURE_ENABLED === "true";
  const { info, status, isLoading } = useHostPlanCapabilities();
  const communityActive =
    info?.tier === "HOST_COMMUNITY" && status === "active";
  const localPrompt = useHostSubscriptionPrompt({ focusTier: "community" });
  const { openForRequired, openForLapsed } = subscriptionPrompt ?? localPrompt;

  const [communityPickOpen, setCommunityPickOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<CommunityAction | null>(
    null
  );
  const { communities, loading, error } = useOwnedCommunitiesPicker(
    communityFeatureOn && communityActive
  );

  const showLock = !isLoading && !communityActive;

  const runAction = (
    action: CommunityAction,
    communityId: string,
    tvActivatedAt?: string | null,
    tvHostPaused?: boolean | null
  ) => {
    if (!hostEventSlug) return;
    const slug = hostEventSlug;
    let href = `/host/${slug}/host-community`;
    switch (action.type) {
      case "communityTab":
        href = buildHostCommunityHref(slug, communityId, action.tab);
        break;
      case "branding":
        href = buildCommunityCustomizationHref(slug, communityId);
        break;
      case "analytics":
        href = buildCommunityAnalyticsHref(slug, communityId);
        break;
      case "tvSchedule":
        if (!tvActivatedAt || tvHostPaused) {
          toast.info("Activate community TV for this community first.");
          setCommunityPickOpen(false);
          setPendingAction(null);
          return;
        }
        href = buildCommunityTvHref(slug, communityId, "schedule");
        break;
    }
    setCommunityPickOpen(false);
    setPendingAction(null);
    router.push(href);
  };

  const startAction = (action: CommunityAction) => {
    if (isLoading || !hostEventSlug || !communityFeatureOn) return;
    if (!communityActive) {
      setHostSubscriptionResume({
        kind: "return-path",
        returnPath: `/host/${hostEventSlug}/host-community`,
      });
      if (status === "lapsed") openForLapsed("community");
      else openForRequired("community");
      return;
    }
    if (loading) {
      toast.info("Loading communities…");
      return;
    }
    if (communities.length === 0) {
      toast.info("Create a community first.");
      router.push(`/host/${hostEventSlug}/host-community`);
      return;
    }
    if (communities.length === 1) {
      const c = communities[0]!;
      runAction(action, c.id, c.tvActivatedAt, c.tvHostPaused);
      return;
    }
    setPendingAction(action);
    setCommunityPickOpen(true);
  };

  const menuItems = useMemo(() => {
    const base: { label: string; action: CommunityAction; hidden?: boolean }[] =
      [
        { label: "Community branding", action: { type: "branding" } },
        {
          label: "Content bank",
          action: { type: "communityTab", tab: "bank" },
        },
        { label: "Community analytics", action: { type: "analytics" } },
        {
          label: "TV schedule reorder",
          action: { type: "tvSchedule" },
        },
        {
          label: "Membership",
          action: { type: "communityTab", tab: "membership" },
        },
        {
          label: "Subscribers",
          action: { type: "communityTab", tab: "subscribers" },
        },
        {
          label: "Co-creators",
          action: { type: "communityTab", tab: "cocreators" },
        },
      ];
    return base;
  }, []);

  if (!communityFeatureOn) return null;

  const onCommunitySelect = (id: string, name: string) => {
    if (!pendingAction) return;
    const row = communities.find(c => c.id === id);
    runAction(pendingAction, id, row?.tvActivatedAt, row?.tvHostPaused);
    void name;
  };

  if (!communityActive) {
    return (
      <>
        <Button
          type="button"
          size={size}
          variant="outline"
          className={className}
          disabled={!hostEventSlug || isLoading}
          onClick={() => startAction({ type: "communityTab", tab: "bank" })}
        >
          {showLock ? (
            <CommunityFeatureBadge label="Requires Host Community — tap to subscribe or renew" />
          ) : null}
          Community tools
        </Button>
        {!subscriptionPrompt ? localPrompt.SubscriptionPromptModal : null}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size={size}
            variant="outline"
            className={className}
            disabled={!hostEventSlug || isLoading}
          >
            Community tools
            <ChevronDown className="ml-1 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {menuItems.map(item => (
            <DropdownMenuItem
              key={item.label}
              onClick={() => startAction(item.action)}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {communityPickOpen ? (
        <HostCommunityPickerDialog
          open={communityPickOpen}
          onOpenChange={open => {
            setCommunityPickOpen(open);
            if (!open) setPendingAction(null);
          }}
          title="Choose a community"
          communities={communities}
          loading={loading}
          error={error}
          onSelect={c => onCommunitySelect(c.id, c.name)}
        />
      ) : null}
      {!subscriptionPrompt ? localPrompt.SubscriptionPromptModal : null}
    </>
  );
}
