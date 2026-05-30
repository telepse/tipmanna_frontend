"use client";

import { useState } from "react";

// Third-party imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Goal, TrendingUp, Trophy } from "lucide-react";

// Local imports
import { Paragraph } from "../shared/paragraph";
import { EventSummaryCard } from "./event-summary-card";
import { VisitorProfileCharacterCard } from "./visitor-profile-character-card";
import { NotificationsTab } from "@/components/notifications/notifications-tab";
import { ReminderBucketTab } from "@/components/notifications/reminder-bucket-tab";
import { Bell } from "lucide-react";
import { Character, Event } from "@/types";

type TippedVideoSummary = {
  videoChannelId: string;
  videoTitle: string | null;
  eventName: string | null;
  tipCount: number;
  totalAmount: number;
  lastTippedAt: string;
  paymentSurfaces: string[];
};

export const VisitorProfileTabs = ({
  events,
  tippedVideos = [],
}: {
  events: Event[];
  tippedVideos?: TippedVideoSummary[];
}) => {
  const [tab, setTab] = useState<
    "history" | "notifications" | "reminders" | "milestones" | "awards"
  >("history");

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs
        value={tab}
        onValueChange={val =>
          setTab(
            val as
              | "history"
              | "notifications"
              | "reminders"
              | "milestones"
              | "awards"
          )
        }
        className="section gap-8 lg:py-12"
      >
        <TabsList className="flex !h-14 w-full border bg-white">
          <TabsTrigger
            value="notifications"
            className="!h-12 text-xs font-semibold data-[state=active]:bg-[#321801] data-[state=active]:text-white sm:text-sm"
          >
            <Bell className="hidden size-6 sm:inline-block" /> Alerts
          </TabsTrigger>
          <TabsTrigger
            value="reminders"
            className="!h-12 text-xs font-semibold data-[state=active]:bg-[#321801] data-[state=active]:text-white sm:text-sm"
          >
            Reminders
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="!h-12 text-xs font-semibold data-[state=active]:bg-[#321801] data-[state=active]:text-white sm:text-sm"
          >
            <TrendingUp className="hidden size-6 sm:inline-block" /> Tipping
            History
          </TabsTrigger>
          <TabsTrigger
            value="milestones"
            className="!h-12 cursor-not-allowed text-xs font-semibold opacity-50 sm:text-sm"
          >
            <Goal className="hidden size-6 sm:inline-block" /> Milestones
          </TabsTrigger>
          <TabsTrigger
            value="awards"
            className="!h-12 cursor-not-allowed text-xs font-semibold opacity-50 sm:text-sm"
          >
            <Trophy className="hidden size-6 sm:inline-block" /> Awards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationsTab variant="page" />
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderBucketTab variant="page" />
        </TabsContent>

        {/* Tipping history */}
        <TabsContent
          value="history"
          className="space-y-4"
        >
          {tippedVideos.length > 0 && (
            <div className="bg-secondary/20 rounded-md border border-[#321801] p-4">
              <Paragraph
                weight="bold"
                className="mb-1"
              >
                Videos you tipped on
              </Paragraph>
              <p className="text-muted-foreground mb-3 text-sm">
                Content you supported with a payment, grouped by video.
              </p>
              <div className="max-h-[40vh] space-y-3 overflow-y-auto">
                {tippedVideos.map(v => (
                  <div
                    key={v.videoChannelId}
                    className="rounded-md border border-[#321801]/30 bg-white p-3 text-sm"
                  >
                    <div className="font-semibold text-[#321801]">
                      {v.videoTitle ?? "Untitled video"}
                    </div>
                    {v.eventName ? (
                      <div className="text-muted-foreground text-xs">
                        {v.eventName}
                      </div>
                    ) : null}
                    <div className="mt-1">
                      £{Number(v.totalAmount).toFixed(2)} · {v.tipCount} tip
                      {v.tipCount === 1 ? "" : "s"}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Last tipped{" "}
                      {new Date(v.lastTippedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {v.paymentSurfaces?.length
                        ? ` · ${v.paymentSurfaces.join(", ")}`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-secondary/20 rounded-md border border-[#321801] p-4">
            {events && (
              <EventSummaryCard
                name={events[0]?.eventName}
                date={events[0]?.eventDate}
                total={events[0]?.totalTipped}
                iTipped={events[0]?.rating}
              />
            )}

            {/* Profile characters */}
            <div className="mt-4 max-h-[45vh] space-y-4 overflow-y-auto">
              {events?.length > 0 && events?.[0]?.characters?.length ? (
                (events?.[0].characters as Character[]).map(
                  (char: Character, index: number) => (
                    <VisitorProfileCharacterCard
                      key={index}
                      name={char.name}
                      icon={`/icons/${char.name.toLowerCase().replace(/\s+/g, "-")}.png`} // or use a mapping if you have specific icons
                      time={char.time}
                      price={char.price.toString()}
                      purchasedAt={char.purchasedAt}
                    />
                  )
                )
              ) : (
                <Paragraph
                  size="sm"
                  color="muted"
                >
                  No tips/characters for this event yet.
                </Paragraph>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Milestones */}
        <TabsContent
          value="milestones"
          className="space-y-4"
        ></TabsContent>

        {/* Awards */}
        <TabsContent
          value="awards"
          className="space-y-4"
        ></TabsContent>
      </Tabs>
    </div>
  );
};
