"use client";

import { useEffect, useState } from "react";

// Third-party imports
import { BanknoteArrowUp, Clock, TrendingUp, Wallet } from "lucide-react";

// Local imports
import { StatCard } from "./stat-card";
import { Event } from "@/types";
import { formatDate } from "@/lib/utils";
import { DashboardHeading } from "./dashboard-heading";
import { Loading } from "../loading";
import { useHostFees } from "@/hooks/useHostFees";
import { SortedEventSkeleton } from "./sorted-event-skeleton";

export const HostFeesClient = () => {
  const { events, hostCredit, appliedFees, hostBonus } = useHostFees();

  // Sort by most recent and pick the latest as default
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(
    sortedEvents?.[0] || null
  );

  useEffect(() => {
    if (!Array.isArray(events) || events.length === 0) return;

    const sorted = [...events].sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
    );

    setSelectedEvent(sorted[0]);
  }, [events]);

  if (!sortedEvents) {
    return <Loading />;
  }

  return (
    <section className="space-y-4 sm:space-y-6">
      <DashboardHeading title="Host Fees" />

      {/* Host fee stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Host Credit"
          value={hostCredit}
          icon={Wallet}
          isMoney
          subLabel="Unpaid services requested"
          hasColor
        />

        <StatCard
          label="Applied Fees"
          value={appliedFees}
          icon={BanknoteArrowUp}
          isMoney
          subLabel="Paid services requested"
          hasColor
        />
        <StatCard
          label="Host Bonus"
          value={hostBonus}
          icon={TrendingUp}
          isMoney
          subLabel="Amount rewarded"
          hasColor
        />
      </div>

      <div className="space-y-4">
        {events.length === 0
          ? Array.from({ length: 3 }).map((_, idx) => (
              <SortedEventSkeleton key={idx} />
            ))
          : sortedEvents.map((event: Event) => {
              const isSelected = selectedEvent?.id === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`flex cursor-pointer items-center justify-between rounded-md border p-4 transition-colors ${
                    isSelected
                      ? "bg-secondary/10 border-primary"
                      : "bg-card hover:bg-secondary/10"
                  }`}
                >
                  <div className="space-y-1">
                    <h6 className="font-semibold">{event.eventName}</h6>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      {formatDate(event.eventDate)} <Clock className="size-4" />{" "}
                      {event.startTime} - {event.endTime}
                    </p>
                  </div>

                  <span className="text-sm">
                    {event.approved && (
                      <span className="bg-success rounded-md px-2 py-1 text-white">
                        Approved
                      </span>
                    )}

                    {!event.approved && !event.rejected && (
                      <span className="bg-primary/20 text-primary rounded-md px-2 py-1">
                        Pending
                      </span>
                    )}

                    {!event.approved && event.rejected && (
                      <span className="bg-destructive rounded-md px-2 py-1 text-white">
                        Rejected
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
      </div>

      {/* Applied fees */}
      {selectedEvent && (
        <div className="bg-card space-y-6 rounded-md border p-6">
          <div className="space-y-2 font-medium">
            <h5 className="text-xl">
              Applied Fees - Resources Request (From Tipmanna)
            </h5>
            <p className="text-muted-foreground text-sm">
              {selectedEvent.eventName}
            </p>
            <p className="text-muted-foreground text-sm">
              Before Event Approval: Host Credit - &pound;
              {selectedEvent.hostCredit} &middot; Host Bonus - &pound;
              {selectedEvent.hostBonus}
            </p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* {resources.length > 0 ? (
              resources.map(r => (
                <div
                  key={r.id}
                  className="grid grid-cols-2 gap-4 text-sm"
                >
                  <h6 className="font-medium capitalize">
                    {r.name.replace(/_/g, " ")}
                  </h6>
                  <p className="text-muted-foreground">-&pound;{r.amount}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No resources found for this event.
              </p>
            )} */}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1 font-medium">
                <h6>Total Fees:</h6>
                <p className="text-muted-foreground">
                  After Event Approval: <br />
                  Fees Paid - &pound;
                  {selectedEvent.approved ? selectedEvent.feesPaid : 0} &middot;
                  Bonus Added - &pound;
                  {selectedEvent.approved ? selectedEvent.bonusAdded : 0}{" "}
                  &middot; Bonus Removed - &pound;
                  {selectedEvent.approved ? selectedEvent.bonusRemoved : 0}{" "}
                  <br />
                  Host Credit - &pound;
                  {selectedEvent.approved
                    ? selectedEvent.hostCreditAfterApproval
                    : 0}{" "}
                  &middot; Host Bonus - &pound;
                  {selectedEvent.approved
                    ? selectedEvent.hostBonusAfterApproval
                    : 0}
                </p>
              </div>
              {/* <p className="text-muted-foreground">
                -&pound;{resources.reduce((sum, r) => sum + (r.amount || 0), 0)}
              </p> */}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
