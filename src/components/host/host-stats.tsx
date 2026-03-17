"use client";

import { useState } from "react";
import Link from "next/link";

// Third-party imports
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Calendar,
  Copy,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { PAYOUT_SUMMARY } from "@/constants";
import { EventStatCard } from "./event-stat-card";
import { RecentEventCard } from "./recent-event-card";
import { PayoutSummaryCard } from "./payout-summary-card";
import { AchievementCard } from "./achievement-card";
import { RootState } from "@/redux/store";
import { GenerateQrButton } from "./generate-qr-button";
import { getEventStats } from "@/lib/utils";

type Event = {
  id: string;
  eventName: string;
  eventDate: string;
  numOfTips: number;
  amountRaised: number;
};

interface Props {
  events: [];
}

export const HostStats = ({ events }: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);

  const [, setCopied] = useState(false);

  if (!user || user.role !== "HOST") return null;
  const eventCode = user!.eventCode;
  const eventSlug = user!.eventSlug;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventCode!);
      setCopied(true);
      toast.success("Event code copied");
    } catch (error) {
      console.error(error);
    }
  };

  const fullLink = `${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/join-host/${eventSlug}?eventCode=${eventCode}`;

  const { totalEventsCreated, totalAmountRaised, numOfTips } =
    getEventStats(events);
  const earnings: number = Number((totalAmountRaised * 0.7).toFixed(2));

  const achievements = [
    totalEventsCreated >= 1,
    numOfTips >= 200,
    totalEventsCreated >= 10,
  ];

  const progress =
    (achievements.filter(Boolean).length / achievements.length) * 100;

  const metCount = achievements.filter(Boolean).length;
  const totalCount = achievements.length;

  const fractionProgress = `${metCount}/${totalCount}`;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-full space-y-6 lg:col-span-7">
        {/* Event statistics */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Event statistics</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <EventStatCard
              title="Events Created"
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
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              Host event code
              <Button onClick={handleCopy}>
                <Copy /> {eventCode}
              </Button>
            </div>

            <GenerateQrButton link={fullLink} />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent events</h2>
            <Link
              href={`/join-host/${eventSlug}?eventCode=${eventCode}`}
              className="text-muted-foreground"
              target="_blank"
            >
              View all events
            </Link>
          </div>

          <div className="space-y-6">
            {events.map((event: Event) => (
              <RecentEventCard
                key={event!.id}
                eventName={event!.eventName}
                eventDate={event!.eventDate}
                numOfTips={event!.numOfTips}
                amountRaised={event!.amountRaised}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-full space-y-6 lg:col-span-5">
        {/* Achievements */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <h2 className="z-20 [mask-image:linear-gradient(to_bottom,white_80%,transparent_100%)] text-2xl font-semibold">
              Achievements
            </h2>

            <span className="text-muted-foreground">{fractionProgress}</span>
          </div>

          <div className="text-muted-foreground flex justify-between">
            <span>Progress</span>{" "}
            <span>
              {Math.min(Math.max(progress, 0), 100).toFixed(2)}% complete
            </span>
          </div>

          <div className="-mt-4 h-2 w-full overflow-hidden rounded-md bg-black">
            <div
              className="bg-primary h-full"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>

          <AchievementCard
            title="First Event"
            subtitle="Hosted your first event"
            icon={Trophy}
            iconColor="#f57d11"
            met={totalEventsCreated >= 1}
          />

          <AchievementCard
            title="200+ Tips"
            subtitle="Reached over 200 total tips"
            icon={Users}
            iconColor="#04802E"
            met={numOfTips >= 200}
          />

          <AchievementCard
            title="Event Master"
            subtitle="Hosted 10+ successful events"
            icon={Target}
            iconColor="#7AADCC"
            met={totalEventsCreated >= 10}
          />
        </div>

        {/* Payout summary */}
        <div className="bg-card space-y-6 rounded-xl border p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Payout summary</h2>
          <div className="space-y-6">
            {PAYOUT_SUMMARY.map((item, index) => (
              <PayoutSummaryCard
                key={index}
                label={item.label}
                value={item.value}
                bgColor={item.bgColor}
                txtColor={item.txtColor}
              />
            ))}

            <Link href={`/host/${eventSlug}/reports`}>
              <Button
                size="lg"
                className="w-full"
              >
                Go to payments & reports &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
