"use client";

import { HostCommunityToolsPicker } from "@/components/dashboard/host-community-tools-picker";
import { HostGrowthToolsPicker } from "@/components/dashboard/host-growth-tools-picker";
import { HostReminderBucketShortcut } from "@/components/dashboard/host-reminder-bucket-shortcut";
import { HostTipLayoutPicker } from "@/components/dashboard/host-tip-layout-picker";
import {
  useHostSubscriptionPrompt,
  type HostSubscriptionPromptFns,
} from "@/hooks/use-host-subscription-prompt";

type Props = {
  hostEventSlug: string | null;
  /** When true, omit tip layout (e.g. dashboard home). */
  hideTipLayout?: boolean;
  className?: string;
  /** When set, page chrome owns the single subscribe modal. */
  subscriptionPrompt?: HostSubscriptionPromptFns;
};

export function HostDashboardShortcutsRow({
  hostEventSlug,
  hideTipLayout = false,
  className = "flex flex-wrap items-center gap-2",
  subscriptionPrompt: subscriptionPromptFromParent,
}: Props) {
  const localPrompt = useHostSubscriptionPrompt({ focusTier: "premium" });
  const subscriptionPrompt = subscriptionPromptFromParent ?? localPrompt;

  return (
    <>
      <div className={className}>
        {!hideTipLayout ? (
          <HostTipLayoutPicker
            hostEventSlug={hostEventSlug}
            subscriptionPrompt={subscriptionPrompt}
          />
        ) : null}
        <HostGrowthToolsPicker
          hostEventSlug={hostEventSlug}
          subscriptionPrompt={subscriptionPrompt}
        />
        <HostCommunityToolsPicker
          hostEventSlug={hostEventSlug}
          subscriptionPrompt={subscriptionPrompt}
        />
        <HostReminderBucketShortcut
          hostEventSlug={hostEventSlug}
          subscriptionPrompt={subscriptionPrompt}
        />
      </div>
      {!subscriptionPromptFromParent
        ? localPrompt.SubscriptionPromptModal
        : null}
    </>
  );
}
