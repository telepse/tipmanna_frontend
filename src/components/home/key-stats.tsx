"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Local imports
import { StatCard } from "./stat-card";
import { KeyStat, KeyStatLastWeek } from "@/types/keystat.types";
import { formatWithCommas } from "@/lib/utils";
import { PARTNER_HOMEPAGE_TOTAL_ENCOUNTERS_LABEL } from "@/lib/partner-homepage-public-copy";
import { Badge } from "../shared/badge";

interface Props {
  stats: KeyStat;
}

function defaultKeyStatLastWeek(): KeyStatLastWeek {
  return {
    totalTipsReceived: 0,
    successfulTransactions: 0,
    activeYoutubeLinks: 0,
    communitiesCreated: 0,
    totalEncounters: 0,
  };
}

function defaultKeyStat(): KeyStat {
  return {
    totalTipsReceived: 0,
    successfulTransactions: 0,
    uniqueTippersAndVisitors: 0,
    activeYoutubeLinks: 0,
    communitiesCreated: 0,
    totalEncounters: 0,
    contentViews: 0,
    lastWeek: defaultKeyStatLastWeek(),
  };
}

function normalizeKeyStatLastWeek(raw: unknown): KeyStatLastWeek {
  const o = raw as Record<string, unknown> | null;
  const base = defaultKeyStatLastWeek();
  if (!o || typeof o !== "object") return base;
  const n = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  return {
    totalTipsReceived: n(o.totalTipsReceived),
    successfulTransactions: n(o.successfulTransactions),
    activeYoutubeLinks: n(o.activeYoutubeLinks),
    communitiesCreated: n(o.communitiesCreated),
    totalEncounters: n(o.totalEncounters),
  };
}

function normalizeKeyStat(raw: unknown): KeyStat {
  const o = raw as Record<string, unknown> | null;
  const base = defaultKeyStat();
  if (!o || typeof o !== "object") return base;
  const n = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  const uniqueTippersAndVisitors =
    "uniqueTippersAndVisitors" in o &&
    typeof o.uniqueTippersAndVisitors === "number"
      ? n(o.uniqueTippersAndVisitors)
      : n(o.uniqueTippers);

  const activeYoutubeLinks =
    "activeYoutubeLinks" in o && typeof o.activeYoutubeLinks === "number"
      ? n(o.activeYoutubeLinks)
      : 0;

  const contentViews =
    "contentViewsOver10Seconds" in o &&
    typeof o.contentViewsOver10Seconds === "number"
      ? n(o.contentViewsOver10Seconds)
      : "contentViews" in o && typeof o.contentViews === "number"
        ? n(o.contentViews)
        : 0;

  return {
    totalTipsReceived: n(o.totalTipsReceived),
    successfulTransactions: n(o.successfulTransactions),
    uniqueTippersAndVisitors,
    activeYoutubeLinks,
    communitiesCreated: n(o.communitiesCreated),
    totalEncounters: n(o.totalEncounters),
    contentViews,
    lastWeek: normalizeKeyStatLastWeek(o.lastWeek),
  };
}

function previousPeriodSubtitle(
  current: number,
  lastWeekGain: number,
  isMoney?: boolean
): string {
  const previous = Math.max(0, current - lastWeekGain);
  const formatted = formatWithCommas(previous);
  return isMoney ? `${formatted} last week` : `${formatted} last week`;
}

export default function KeyStats({ stats }: Props) {
  const [liveStats, setLiveStats] = useState<KeyStat>(() =>
    normalizeKeyStat(stats)
  );
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/impact-in-numbers", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      setLiveStats(normalizeKeyStat(data));
    } catch {
      // Keep last known stats on transient failures.
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      void refresh();
    };

    const id = window.setInterval(tick, 30_000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [refresh]);

  return (
    <section className="bg-[#FFFAF6] py-12">
      <div className="wrapper section p-4">
        <Badge
          title="Our Impact
        
        "
        />
        <div className="mt-6 grid grid-cols-12 gap-4 sm:gap-6 lg:gap-12">
          <div className="bg-primary section relative col-span-full rounded-2xl text-white lg:col-span-5">
            <span className="border-primary open_sans z-10 inline-flex w-fit items-center gap-2 rounded-full border bg-black/50 px-4 py-3 text-xs font-medium sm:text-sm">
              <span className="bg-primary size-5 rounded-full"></span> Live
              updates every 30 seconds
            </span>

            <h2 className="montserrat z-10 text-4xl font-semibold sm:text-6xl">
              Our impact in numbers
            </h2>

            <Image
              src="/vectors/impact_vector.webp"
              alt=""
              width={100}
              height={100}
              loading="lazy"
              className="absolute right-0 bottom-0 size-40 rounded-b-2xl object-contain"
              aria-hidden
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

          <div className="relative col-span-full mx-auto grid w-full max-w-xl grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:col-span-7">
            <StatCard
              label={`(${liveStats.successfulTransactions} tips)`}
              value={liveStats.totalTipsReceived}
              subtitle={previousPeriodSubtitle(
                liveStats.totalTipsReceived,
                liveStats.lastWeek.totalTipsReceived,
                true
              )}
              isMoney
            />
            <StatCard
              label="Channels Created"
              value={liveStats.activeYoutubeLinks}
              subtitle={previousPeriodSubtitle(
                liveStats.activeYoutubeLinks,
                liveStats.lastWeek.activeYoutubeLinks
              )}
            />
            <StatCard
              label="Communities Started"
              value={liveStats.communitiesCreated}
              subtitle={previousPeriodSubtitle(
                liveStats.communitiesCreated,
                liveStats.lastWeek.communitiesCreated
              )}
            />
            <StatCard
              label={PARTNER_HOMEPAGE_TOTAL_ENCOUNTERS_LABEL}
              value={liveStats.totalEncounters}
              subtitle={previousPeriodSubtitle(
                liveStats.totalEncounters,
                liveStats.lastWeek.totalEncounters
              )}
            />

            {/* <StatCard
              label="Transactions"
              value={liveStats.successfulTransactions}
              subtitle={weeklySubtitle(
                liveStats.lastWeek.successfulTransactions
              )}
            /> */}

            {/* <StatCard
              label="Content views"
              subtitle="Watched 10 secs"
              value={liveStats.contentViews}
            /> */}

            <Image
              src="/icons/flash.png"
              alt="Flash"
              width={50}
              height={50}
              className="pointer-events-none absolute -bottom-8 size-10 object-contain lg:-top-8 lg:-right-8"
              aria-hidden="true"
            />

            <Image
              src="/icons/flash.png"
              alt="Flash"
              width={50}
              height={50}
              className="pointer-events-none absolute -right-4 -bottom-16 size-16 object-contain lg:-right-16 lg:-bottom-8"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
