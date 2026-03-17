"use client";

import Image from "next/image";
import { useState } from "react";

// Local imports
import { StatCard } from "./stat-card";
import { KeyStat } from "@/types/keystat.types";

interface Props {
  stats: KeyStat;
}

// Helper function to safely get numeric values
const getSafeNumber = (
  value: number | undefined | null,
  fallback: number = 0
): number => {
  return typeof value === "number" ? value : fallback;
};

export const revalidate = 30;

export default function KeyStats({ stats }: Props) {
  const [liveStats] = useState<KeyStat>(stats);

  // useEffect(() => {
  //   const channel = pusherClient.subscribe("home-stats");

  //   const handleUpdate = (data: KeyStat) => {
  //     setLiveStats(data);
  //   };

  //   channel.bind("update", handleUpdate);

  //   return () => {
  //     channel.unbind("update", handleUpdate);
  //     channel.unsubscribe();
  //   };
  // }, []);

  // Safely extract values with fallbacks
  // const safeStats = {
  //   totalTipsReceived: getSafeNumber(liveStats?.totalTipsReceived),
  //   successfulTransactions: getSafeNumber(liveStats?.successfulTransactions),
  //   uniqueTippers: getSafeNumber(liveStats?.uniqueTippers),
  //   totalEvents: getSafeNumber(liveStats?.totalEvents),
  // };

  const safeStats = {
    totalTipsReceived: liveStats?.totalTipsReceived ?? 0,
    successfulTransactions: liveStats?.successfulTransactions ?? 0,
    uniqueTippers: liveStats?.uniqueTippers ?? 0,
    totalEvents: liveStats?.totalEvents ?? 0,
  };

  return (
    <section className="bg-[#FFFAF6] py-12">
      <div className="wrapper p-4">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-12">
          <div className="bg-primary section relative col-span-full rounded-2xl text-white lg:col-span-5">
            {/* Badge */}
            <span className="border-primary open_sans z-10 inline-flex w-fit items-center gap-2 rounded-full border bg-black/50 px-4 py-3 text-xs font-medium sm:text-sm">
              <span className="bg-primary size-5 rounded-full"></span> Live
              updates every 30 seconds
            </span>

            <h2 className="montserrat z-10 text-4xl font-semibold sm:text-6xl">
              Our impact in numbers
            </h2>

            <Image
              src="/vectors/impact_vector.webp"
              alt="Impact vector"
              width={100}
              height={100}
              priority
              className="absolute right-0 bottom-0 size-40 rounded-b-2xl object-contain"
              aria-hidden="true"
            />

            <Image
              src="/icons/trophy.png"
              alt="Trophy"
              width={50}
              height={50}
              className="absolute -top-8 -left-4 size-16 object-contain lg:-left-8"
              aria-hidden="true"
            />

            <Image
              src="/icons/diamond.png"
              alt="Diamond"
              width={50}
              height={50}
              className="absolute -right-4 -bottom-8 size-12 -rotate-[45deg] object-contain lg:-right-8 lg:-bottom-8"
              aria-hidden="true"
            />
          </div>

          <div className="relative col-span-full grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:col-span-7">
            <StatCard
              label="Tips Received"
              value={safeStats.totalTipsReceived}
              isMoney
            />
            <StatCard
              label="Transactions"
              value={safeStats.successfulTransactions}
            />
            <StatCard
              label="Active Tippers"
              value={safeStats.uniqueTippers}
            />
            <StatCard
              label="Events Added"
              value={safeStats.totalEvents}
            />

            <Image
              src="/icons/flash.png"
              alt="Flash"
              width={50}
              height={50}
              className="absolute -bottom-8 size-10 object-contain lg:-top-8 lg:-right-8"
              aria-hidden="true"
            />

            <Image
              src="/icons/flash.png"
              alt="Flash"
              width={50}
              height={50}
              className="absolute -right-4 -bottom-16 size-16 object-contain lg:-right-16 lg:-bottom-8"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
