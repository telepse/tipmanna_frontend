"use client";

import { useState } from "react";

// Third-party imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Goal, TrendingUp, Trophy } from "lucide-react";

// Local imports
import { Paragraph } from "../shared/paragraph";
import { EventSummaryCard } from "./event-summary-card";
import { VisitorProfileCharacterCard } from "./visitor-profile-character-card";
import { Character, Event } from "@/types";

export const VisitorProfileTabs = ({ events }: { events: Event[] }) => {
  const [tab, setTab] = useState<"history" | "milestones" | "awards">(
    "history"
  );

  console.log("vsiitor profile tabs", events);

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs
        value={tab}
        onValueChange={val =>
          setTab(val as "history" | "milestones" | "awards")
        }
        className="section gap-8 lg:py-12"
      >
        <TabsList className="flex !h-14 w-full border bg-white">
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

        {/* Tipping history */}
        <TabsContent
          value="history"
          className="space-y-4"
        >
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
