"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// Third-party imports
import { useSelector } from "react-redux";
import {
  Bell,
  Calendar,
  CalendarDays,
  CirclePlus,
  Clock,
  Plus,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Local imports
import { DashboardHeading } from "./dashboard-heading";
import { RootState } from "@/redux/store";
import { getEventStats } from "@/lib/utils";
import { StatCard } from "./stat-card";
import type { Event } from "@/types";
import { RecentEventCard } from "./recent-event-card";
import { useHostEvents } from "@/hooks/useHostEvents";
import { HostSubscriptionPanel } from "@/components/dashboard/host-subscription-panel";
import { CreateDialog } from "@/components/home/create-dialog";
import { FormDraftsPanel } from "@/components/dashboard/form-drafts-panel";

export const DashboardClient = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const params = useParams();
  const [createOpen, setCreateOpen] = useState(false);
  const hostEventSlugParam =
    typeof params?.slug === "string" ? params.slug : undefined;

  const { events } = useHostEvents();

  if (!user) {
    return <p>Loading...</p>;
  }

  const eventStats = getEventStats(events);
  const earnings: number = Number(
    (eventStats.totalAmountRaised * 0.7).toFixed(2)
  );

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Dashboard heading */}
      <div className="flex items-start justify-between">
        <DashboardHeading
          title={`Welcome back, ${user?.fullName}`}
          subtitle="Here's what's happening with your events today."
        />

        <div className="flex items-center gap-2">
          <div className="fle-col flex size-10 cursor-pointer items-center justify-center rounded-full bg-gray-200 p-2">
            <Bell className="size-5" />
          </div>
          <Link
            href={`/host/${"eventSlug" in user && user.eventSlug ? user.eventSlug : user.username}/profile`}
            className="rounded-full border p-2 transition-all duration-300 hover:bg-black hover:text-white"
          >
            <UserRound className="size-5" />
          </Link>
        </div>
      </div>

      {"role" in user && user.role === "HOST" && (
        <HostSubscriptionPanel eventSlug={hostEventSlugParam} />
      )}

      {"role" in user && user.role === "HOST" && <FormDraftsPanel />}

      {/* New host check */}
      {/* {events?.length < 1 && (
        <div className="bg-moonstone-blue/50 flex flex-wrap items-center gap-2 rounded-md p-4 text-sm sm:gap-4">
          <span className="text-sm font-medium">
            Create your first event to use dashboard
          </span>{" "}
          <Link href="/add-event">
            <Button className="bg-black">
              <Plus /> Create event
            </Button>
          </Link>
        </div>
      )} */}

      {/* Event stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Events"
          value={eventStats.activeEvents}
          icon={Calendar}
          subLabel="Currenty ongoing"
          hasColor
        />
        <StatCard
          label="Completed Events"
          value={eventStats.completedEvents}
          icon={TrendingUp}
          subLabel="Successfully finished"
          hasColor
        />
        <StatCard
          label="Pending Events"
          value={eventStats.pendingEvents}
          icon={Clock}
          subLabel="Events yet to be approved"
          hasColor
        />
        <StatCard
          label="Earnings"
          value={earnings}
          icon={Wallet}
          subLabel="70% of total tips received"
          isMoney
          hasColor
        />
      </div>

      {/* Recent activity and upcoming events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="bg-card rounded-md border p-6">
          <h5 className="text-xl font-medium">Recent Activity</h5>

          <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 sm:min-h-[350px] sm:gap-4">
            <div className="bg-gray rounded-full border p-4 sm:p-6">
              <CalendarDays className="text-muted-foreground size-10 sm:size-16" />
            </div>

            <h5 className="text-xl font-medium">No activity yet</h5>
            <p className="text-muted-foreground text-center text-sm">
              Add your event, your activities will display here.
            </p>
          </div>
        </div>

        {/* Recent events */}
        <div className="bg-card space-y-4 rounded-md border p-6">
          <h5 className="text-xl font-medium">Recent Events</h5>

          <div className="space-y-4">
            {events.length > 1 ? (
              events.slice(0, 3).map((event: Event) => (
                <RecentEventCard
                  key={event.id}
                  eventName={event.eventName}
                  eventDate={event.eventDate}
                  startTime={event.startTime}
                  endTime={event.endTime}
                  amountToRaise={event.amountToRaise}
                />
              ))
            ) : (
              <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 sm:min-h-[350px] sm:gap-4">
                <div className="bg-gray rounded-full border p-4 sm:p-6">
                  <CirclePlus className="text-muted-foreground size-10 sm:size-16" />
                </div>

                <h5 className="text-xl font-medium">No activity yet</h5>
                <p className="text-muted-foreground text-sm">
                  Create your first event, your recents will display here.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => setCreateOpen(true)}
            >
              <Plus /> Create new event
            </Button>
          </div>
        </div>
      </div>

      <CreateDialog
        openPopup={createOpen}
        setOpenPopup={setCreateOpen}
      />
    </section>
  );
};
