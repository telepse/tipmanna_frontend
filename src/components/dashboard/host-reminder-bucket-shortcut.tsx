"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { CommunityFeatureBadge } from "@/components/dashboard/community-feature-badge";
import { HostCommunityPickerDialog } from "@/components/dashboard/host-community-picker-dialog";
import { useHostPlanCapabilities } from "@/hooks/useHostPlanCapabilities";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";
import { buildCommunityTvHref } from "@/lib/host-dashboard-shortcuts";
import { useOwnedCommunitiesPicker } from "@/lib/use-owned-communities-picker";
import { setHostSubscriptionResume } from "@/lib/host-subscription-resume";

type Props = {
  hostEventSlug: string | null;
  subscriptionPrompt?: HostSubscriptionPromptFns;
  size?: "sm" | "default";
  className?: string;
};

export function HostReminderBucketShortcut({
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
  const { openForRequired, openForLapsed } =
    subscriptionPrompt ?? localPrompt;

  const [pickerOpen, setPickerOpen] = useState(false);
  const { communities, loading, error } = useOwnedCommunitiesPicker(
    communityFeatureOn && (communityActive || pickerOpen)
  );

  const tvReady = useMemo(
    () => communities.filter(c => c.tvActivatedAt && !c.tvHostPaused),
    [communities]
  );

  const showLock = !isLoading && !communityActive;

  const goReminders = (communityId: string) => {
    if (!hostEventSlug) return;
    router.push(buildCommunityTvHref(hostEventSlug, communityId, "reminders"));
  };

  const onClick = () => {
    if (isLoading || !hostEventSlug || !communityFeatureOn) return;
    if (!communityActive) {
      const returnPath = hostEventSlug
        ? `/host/${hostEventSlug}/host-community`
        : "/";
      setHostSubscriptionResume({ kind: "return-path", returnPath });
      if (status === "lapsed") openForLapsed("community");
      else openForRequired("community");
      return;
    }
    if (loading) {
      setPickerOpen(true);
      return;
    }
    if (tvReady.length === 0) {
      toast.info(
        "Activate community TV for a community first, then send reminder broadcasts."
      );
      router.push(`/host/${hostEventSlug}/host-community`);
      return;
    }
    if (tvReady.length === 1) {
      goReminders(tvReady[0]!.id);
      return;
    }
    setPickerOpen(true);
  };

  if (!communityFeatureOn) return null;

  return (
    <>
      <Button
        type="button"
        size={size}
        variant="outline"
        className={className}
        disabled={!hostEventSlug || isLoading}
        onClick={onClick}
      >
        {showLock ? (
          <CommunityFeatureBadge label="Requires Host Community — tap to subscribe or renew" />
        ) : null}
        Send reminder
      </Button>
      {pickerOpen ? (
        <HostCommunityPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          title="Send reminder bucket"
          communities={tvReady.map(c => ({ id: c.id, name: c.name }))}
          loading={loading}
          error={error}
          onSelect={c => {
            setPickerOpen(false);
            goReminders(c.id);
          }}
        />
      ) : null}
      {!subscriptionPrompt ? localPrompt.SubscriptionPromptModal : null}
    </>
  );
}
