"use client";

import Link from "next/link";

// Third-party imports
import { useSelector } from "react-redux";
import { MoveLeft, Trophy, User } from "lucide-react";

// Local imports
import { RootState } from "@/redux/store";
import { EventBreakdownCard } from "./event-breakdown-card";

interface Props {
  username: string;
  totalContribution: number;
  highestSingleTip: number;
  eventsSupported: number;
  contributionHistory: [];
}

interface Event {
  eventName: string;
  totalContribution: number;
  numOfTips: number;
  recentTips: [];
}

export const TipperDetailClient = ({
  username,
  totalContribution,
  highestSingleTip,
  eventsSupported,
  contributionHistory,
}: Props) => {
  const user = useSelector((state: RootState) => state.auth.user);

  let eventSlug;
  if (user?.role === "HOST") {
    eventSlug = user?.eventSlug;
  }

  // Badge unlock conditions
  const localUnlocked = eventsSupported >= 1;
  const countyUnlocked = eventsSupported >= 10;

  return (
    <section className="flex flex-col gap-6">
      <Link
        href={`/host/${eventSlug}/top-tippers`}
        className="flex w-fit items-center gap-2 text-xl font-medium"
      >
        <MoveLeft /> Back to Top Tippers
      </Link>

      {/* Tipper detail */}
      <div className="bg-secondary/10 flex flex-col justify-between gap-2 rounded-md border px-6 py-12 sm:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border bg-white">
            <User className="text-primary size-10 font-semibold" />
          </div>

          <div className="space-y-2">
            <h5 className="text-xl font-medium">{username}</h5>

            {/* Badges unlocked */}
            <div className="flex gap-2">
              <span
                className={`bg-primary flex items-center gap-1 rounded-md px-4 py-1 text-sm font-medium text-white ${
                  localUnlocked ? "opacity-100" : "opacity-50"
                }`}
              >
                <Trophy className="size-4" /> Local
              </span>
              <span
                className={`bg-primary flex items-center gap-1 rounded-md px-4 py-1 text-sm font-medium text-white ${
                  countyUnlocked ? "opacity-100" : "opacity-50"
                }`}
              >
                <Trophy className="size-4" /> County
              </span>
            </div>
          </div>
        </div>

        {/* Total contribution, highest single tip, and events supported */}
        <div className="flex gap-4">
          <div className="space-y-1">
            <h6 className="text-primary font-semibold">
              &pound;{totalContribution}
            </h6>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Total Contribution
            </p>
          </div>

          <div className="space-y-1">
            <h6 className="text-primary font-semibold">
              &pound; {highestSingleTip}
            </h6>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Highest Single Tip
            </p>
          </div>

          <div className="space-y-1">
            <h6 className="font-semibold">{eventsSupported}</h6>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Events Supported
            </p>
          </div>
        </div>
      </div>

      {/* Contribution history */}
      <div className="bg-card space-y-6 rounded-md border p-6">
        <h5 className="font-semibold">
          Contribution History (Event Breakdown)
        </h5>

        <div className="space-y-6">
          {contributionHistory.map((event: Event, index: number) => (
            <EventBreakdownCard
              key={index}
              eventName={event.eventName}
              totalContribution={event.totalContribution}
              numOfTips={event.numOfTips}
              recentTips={event.recentTips}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
