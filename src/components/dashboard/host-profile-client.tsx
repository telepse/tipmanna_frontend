"use client";

import { useHostEvents } from "@/hooks/useHostEvents";
import { useHostPayoutSummary } from "@/hooks/useHostPayoutSummary";
import { useHostStats } from "@/hooks/useHostStats";
import { HostBanner } from "../host/host-banner";
import { HostStats } from "../host/host-stats";

export const HostProfileClient = () => {
  const { events } = useHostEvents();
  const { stats } = useHostStats();
  const { summary } = useHostPayoutSummary();

  return (
    <section className="flex flex-col gap-6">
      <HostBanner />
      <HostStats
        events={events}
        stats={stats}
        payoutSummary={summary}
      />
    </section>
  );
};
