"use client";

import { HostCommunityToolsPicker } from "@/components/dashboard/host-community-tools-picker";
import { HostGrowthToolsPicker } from "@/components/dashboard/host-growth-tools-picker";
import { HostReminderBucketShortcut } from "@/components/dashboard/host-reminder-bucket-shortcut";
import { HostTipLayoutPicker } from "@/components/dashboard/host-tip-layout-picker";

type Props = {
  hostEventSlug: string | null;
  /** When true, omit tip layout (e.g. dashboard home). */
  hideTipLayout?: boolean;
  className?: string;
};

export function HostDashboardShortcutsRow({
  hostEventSlug,
  hideTipLayout = false,
  className = "flex flex-wrap items-center gap-2",
}: Props) {
  return (
    <div className={className}>
      {!hideTipLayout ? (
        <HostTipLayoutPicker hostEventSlug={hostEventSlug} />
      ) : null}
      <HostGrowthToolsPicker hostEventSlug={hostEventSlug} />
      <HostCommunityToolsPicker hostEventSlug={hostEventSlug} />
      <HostReminderBucketShortcut hostEventSlug={hostEventSlug} />
    </div>
  );
}
