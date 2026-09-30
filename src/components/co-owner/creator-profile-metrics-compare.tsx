"use client";

import { useEffect, useState } from "react";
import { getHostCreatorPublicProfileForOwnerAction } from "@/actions/host-creator";
import { useHostSession } from "@/hooks/use-host-session";

type StatsBlock = {
  totalVideos: number;
  totalEncounters: number;
  totalTipCount: number;
};

function MetricPair({
  label,
  accrued,
  owned,
}: {
  label: string;
  accrued: number;
  owned: number;
}) {
  if (accrued === owned) {
    return (
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-semibold tabular-nums">{accrued.toLocaleString()}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold tabular-nums">
        {accrued.toLocaleString()}
        <span className="text-muted-foreground ml-1 text-[11px] font-normal">
          (public profile, includes co-owner)
        </span>
      </p>
      <p className="text-muted-foreground text-[11px] tabular-nums">
        Owned only: {owned.toLocaleString()}
      </p>
    </div>
  );
}

/** Dashboard-only: accrued public profile metrics vs owned-only true state. */
export function CreatorProfileMetricsCompare() {
  const { hostUser } = useHostSession();
  const [stats, setStats] = useState<{
    accrued: StatsBlock;
    owned: StatsBlock;
  } | null>(null);

  useEffect(() => {
    const username = hostUser?.username?.trim();
    if (!username) return;
    let cancelled = false;
    void getHostCreatorPublicProfileForOwnerAction(username).then(result => {
      if (cancelled || !result.success || !result.data) return;
      const accrued = result.data.stats;
      const owned = result.data.statsOwnedOnly ?? result.data.stats;
      setStats({
        accrued: {
          totalVideos: accrued.totalVideos,
          totalEncounters: accrued.totalEncounters,
          totalTipCount: accrued.totalTipCount,
        },
        owned: {
          totalVideos: owned.totalVideos,
          totalEncounters: owned.totalEncounters,
          totalTipCount: owned.totalTipCount,
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hostUser?.username]);

  if (!stats) return null;

  const hasCoOwnerAccrual =
    stats.accrued.totalVideos !== stats.owned.totalVideos ||
    stats.accrued.totalEncounters !== stats.owned.totalEncounters ||
    stats.accrued.totalTipCount !== stats.owned.totalTipCount;

  if (!hasCoOwnerAccrual) return null;

  return (
    <div className="bg-muted/30 mb-4 grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-3">
      <MetricPair
        label="Videos"
        accrued={stats.accrued.totalVideos}
        owned={stats.owned.totalVideos}
      />
      <MetricPair
        label="Seen"
        accrued={stats.accrued.totalEncounters}
        owned={stats.owned.totalEncounters}
      />
      <MetricPair
        label="Tips"
        accrued={stats.accrued.totalTipCount}
        owned={stats.owned.totalTipCount}
      />
    </div>
  );
}
