"use client";

import Link from "next/link";

// Third-party imports
import { MoveLeft, Trophy, User } from "lucide-react";

// Local imports
import { useHostSession } from "@/hooks/use-host-session";
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
  const hostSession = useHostSession();
  const eventSlug = hostSession.eventSlug ?? "";

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
      <div className="bg-card space-y-6 rounded-md border p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-full border bg-white p-2">
            <User className="text-primary size-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{username}</h2>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <h6 className="text-primary text-xl font-semibold">
              &pound;{totalContribution}
            </h6>
            <p className="text-muted-foreground text-sm">Total contribution</p>
          </div>
          <div className="space-y-1">
            <h6 className="text-xl font-semibold">&pound;{highestSingleTip}</h6>
            <p className="text-muted-foreground text-sm">Highest single tip</p>
          </div>
          <div className="space-y-1">
            <h6 className="text-xl font-semibold">{eventsSupported}</h6>
            <p className="text-muted-foreground text-sm">Events supported</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contribution breakdown</h3>
        {contributionHistory.length === 0 ? (
          <p className="text-muted-foreground text-sm">No event history yet.</p>
        ) : (
          contributionHistory.map((event: Event, index) => (
            <EventBreakdownCard
              key={`${event.eventName}-${index}`}
              eventName={event.eventName}
              totalContribution={event.totalContribution}
              numOfTips={event.numOfTips}
              recentTips={event.recentTips}
            />
          ))
        )}
      </div>
    </section>
  );
};
