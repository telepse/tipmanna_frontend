"use client";

import { useHostEvents } from "@/hooks/useHostEvents";
import { HostBanner } from "../host/host-banner";
import { HostStats } from "../host/host-stats";

export const HostProfileClient = () => {
  const { events } = useHostEvents();

  return (
    <section className="flex flex-col gap-6">
      <HostBanner />
      <HostStats events={events as unknown as []} />
    </section>
  );
};
