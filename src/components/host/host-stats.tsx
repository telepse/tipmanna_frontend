"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  Calendar,
  Copy,
  SquarePen,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type { HostPayoutSummaryBlock } from "@/actions/host-payouts";
import type { HostStatsSummary } from "@/hooks/useHostStats";

import { EventStatCard } from "./event-stat-card";
import { RecentEventCard } from "./recent-event-card";
import { PayoutSummaryCard } from "./payout-summary-card";
import { AchievementCard } from "./achievement-card";

import { useHostSession } from "@/hooks/use-host-session";
import type { RootState } from "@/redux/store";

import { GenerateQrButton } from "./generate-qr-button";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { formatGbpMinor } from "@/lib/host-plan-capabilities";
import { ACHIEVEMENTS } from "@/constants";
import type { Event } from "@/types";

interface Props {
  events: Event[];
  stats: HostStatsSummary | null;
  payoutSummary?: HostPayoutSummaryBlock | null;
}

export const HostStats = ({ events, stats, payoutSummary }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const hostSession = useHostSession();

  const params = useParams();

  const [, setCopied] = useState(false);

  /*
   * Keep the stats visible as long as an authenticated user exists.
   *
   * The previous strict:
   *
   *   user.role !== "HOST"
   *
   * could cause the entire component to return null if the
   * runtime role value differs in casing or representation.
   */
  if (!user) return null;

  const eventSlug =
    typeof params?.slug === "string"
      ? params.slug
      : (hostSession.eventSlug ?? ("eventSlug" in user ? user.eventSlug : ""));

  const eventCode = hostSession.eventCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(eventCode ?? ""));

      setCopied(true);

      toast.success("Event code copied");
    } catch (error) {
      console.error(error);
    }
  };

  const fullLink = getPublicAbsoluteUrl(
    `/join-host/${eventSlug}?eventCode=${encodeURIComponent(
      String(eventCode ?? "")
    )}`
  );

  const totalEventsCreated = stats?.totalEventsCreated ?? 0;

  const totalAttendeesReached = stats?.totalAttendeesReached ?? 0;

  const numOfTips = stats?.totalTips ?? 0;

  const totalAmountRaised = stats?.totalTipsEarned ?? 0;

  const earnings = Number((totalAmountRaised * 0.7).toFixed(2));

  const achievementChecks = [
    totalEventsCreated >= 1,
    totalAttendeesReached >= 1000,
    totalEventsCreated >= 25,
  ];

  const progress =
    (achievementChecks.filter(Boolean).length / achievementChecks.length) * 100;

  const metCount = achievementChecks.filter(Boolean).length;
  const totalCount = achievementChecks.length;

  const fractionProgress = `${metCount}/${totalCount}`;

  const recentEvents = events.slice(0, 5);

  return (
    <div className="grid w-full min-w-0 grid-cols-12 gap-6 overflow-x-hidden">
      {/* =========================================================
          LEFT COLUMN
          ========================================================= */}
      <div className="col-span-full min-w-0 space-y-6 lg:col-span-7">
        {/* Event statistics */}
        <div className="bg-card min-w-0 space-y-6 rounded-xl border p-4 shadow-sm sm:p-6">
          <h2 className="text-2xl font-semibold">Event statistics</h2>

          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
            <EventStatCard
              title="Channels Created"
              value={totalEventsCreated}
              icon={Calendar}
            />

            <EventStatCard
              title="Tips"
              value={numOfTips}
              icon={Users}
            />

            <EventStatCard
              title="Tips Received"
              value={totalAmountRaised}
              icon={Wallet}
              isMoney
            />

            <EventStatCard
              title="Earnings"
              value={earnings}
              icon={TrendingUp}
              isMoney
            />
          </div>
        </div>

        {/* Recent events */}
        <div className="bg-card min-w-0 space-y-6 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
          {/* Event code section */}
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="shrink-0">Host event code</span>

              <Button
                onClick={handleCopy}
                className="w-fit max-w-full"
              >
                <Copy />
                <span className="max-w-[180px] truncate">{eventCode}</span>
              </Button>

              <button
                type="button"
                className="flex w-fit max-w-full cursor-pointer items-center gap-2 rounded-md border border-black p-2 text-sm hover:bg-black hover:text-white"
              >
                <SquarePen className="size-4 shrink-0" />
                <span className="max-w-[180px] truncate">
                  @{hostSession.username ?? ""}
                </span>
              </button>
            </div>

            <div className="w-full sm:w-auto">
              <GenerateQrButton link={fullLink} />
            </div>
          </div>

          {/* Recent events heading */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-semibold">Recent events</h2>

            <Link
              href={`/join-host/${eventSlug}?eventCode=${eventCode}`}
              className="text-muted-foreground w-fit text-sm"
              target="_blank"
            >
              View all events
            </Link>
          </div>

          {/* Recent event cards */}
          <div className="min-w-0 space-y-6">
            {recentEvents.length > 0 ? (
              recentEvents.map(event => (
                <RecentEventCard
                  key={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  numOfTips={event.numOfTips}
                  amountRaised={event.amountRaised}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No events yet. Your recent events will appear here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT COLUMN
          ========================================================= */}
      <div className="col-span-full min-w-0 space-y-6 lg:col-span-5">
        {/* Achievements */}
        <div className="bg-card min-w-0 space-y-6 overflow-hidden rounded-xl border p-4 shadow-sm sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="z-20 [mask-image:linear-gradient(to_bottom,white_80%,transparent_100%)] text-2xl font-semibold">
              Achievements
            </h2>

            <span className="text-muted-foreground shrink-0">
              {fractionProgress}
            </span>
          </div>

          <div className="text-muted-foreground flex justify-between gap-4">
            <span>Progress</span>

            <span className="text-right">
              {Math.min(Math.max(progress, 0), 100).toFixed(2)}% complete
            </span>
          </div>

          <div className="-mt-4 h-2 w-full overflow-hidden rounded-md bg-black">
            <div
              className="bg-primary h-full"
              style={{
                width: `${Math.min(Math.max(progress, 0), 100)}%`,
              }}
            />
          </div>

          {ACHIEVEMENTS.map((achievement, index) => {
            const Icon = achievement.icon;

            return (
              <AchievementCard
                key={achievement.title}
                title={achievement.title}
                subtitle={achievement.subtitle}
                icon={Icon}
                iconColor={achievement.iconColor}
                met={achievementChecks[index] ?? false}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
