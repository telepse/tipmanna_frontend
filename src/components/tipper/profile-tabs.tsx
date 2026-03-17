"use client";

import { useMemo, useState } from "react";

// Third-party imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Bookmark, Goal, TrendingUp, Trophy } from "lucide-react";

// Local imports
import { PROFILE_AWARDS } from "@/constants";
import { ProfileCharacterCard } from "./profile-character-card";
import { ProfileEventCard } from "./profile-event-card";
import { Paragraph } from "../shared/paragraph";
import Charities from "../home/charities";
import { EventSummaryCard } from "./event-summary-card";
import { ProfileMilestoneCard } from "./profile-milestone-card";
import { ProfileAwardCard } from "./profile-award-card";
import { Character, Event } from "@/types";

type MilestoneStatus = "locked" | "unlocked";

interface Milestone {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: MilestoneStatus;
  extraInfo?: number | null;
}

export const PROFILE_MILESTONES = [
  {
    id: "tipper_first",
    title: "Tipper",
    description: "Made your first tip to unlock the tipper milestone",
    condition: (tipperEvents: number, totalTipped: number) => tipperEvents >= 1,
  },
  {
    id: "tipper_100",
    title: "Terrific",
    description:
      "Tipped over £100 total in a single event to show your support",
    condition: (tipperEvents: number, totalTipped: number) =>
      totalTipped >= 100,
  },
  {
    id: "tipper_5000",
    title: "Tremendous",
    description: "Tipped over £5000 across all events to become legendary",
    condition: (tipperEvents: number, totalTipped: number) =>
      totalTipped >= 5000,
  },
];

type Cause = {
  id: string;
  logoUrl: string;
  name: string;
};

interface Props {
  events: Event[];
  causes: Cause[];
}

export const ProfileTabs = ({ events, causes }: Props) => {
  const [tab, setTab] = useState<"history" | "milestones" | "awards" | "saved">(
    "history"
  );

  // Compute tipper event count
  const tipperEventCount = events.length;

  const [selectedEvent, setSelectedEvent] = useState(events?.[0] || null);

  // Determine cumulative unlocked awards
  const unlockedAwardIds = useMemo(() => {
    const ids: string[] = [];
    if (tipperEventCount >= 1) ids.push("local");
    if (tipperEventCount >= 10) ids.push("county");
    if (tipperEventCount >= 20) ids.push("national");
    if (tipperEventCount >= 50) ids.push("global");
    return ids;
  }, [tipperEventCount]);

  const totalTippedAmount = events.reduce((sum, ev) => sum + ev.totalTipped, 0);

  const milestonesWithStatus: Milestone[] = PROFILE_MILESTONES.map(
    milestone => {
      let progress = 0;
      let status: MilestoneStatus = "locked";
      let extraInfo: number | null = null; // store number of times milestone was exceeded

      if (milestone.id === "tipper_first") {
        progress = tipperEventCount >= 1 ? 100 : 0;
        status = tipperEventCount >= 1 ? "unlocked" : "locked";
      } else if (milestone.id === "tipper_100") {
        // Count events where totalTipped >= 100
        const countOver100 = events.filter(ev => ev.totalTipped >= 100).length;
        const maxSingleEvent = events.length
          ? Math.max(...events.map(ev => ev.totalTipped))
          : 0;
        progress = Math.min(100, (maxSingleEvent / 100) * 100);
        status = maxSingleEvent >= 100 ? "unlocked" : "locked";
        extraInfo = countOver100; // pass count to card
      } else if (milestone.id === "tipper_5000") {
        progress = Math.min(100, (totalTippedAmount / 5000) * 100);
        status = totalTippedAmount >= 5000 ? "unlocked" : "locked";
      }

      return { ...milestone, progress, status, extraInfo };
    }
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Tabs
        value={tab}
        onValueChange={val =>
          setTab(val as "history" | "milestones" | "awards" | "saved")
        }
        className="section gap-8 lg:py-12"
      >
        <TabsList className="flex !h-14 w-full border bg-white">
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <TrendingUp className="hidden size-6 sm:inline-block" /> Tipping
            History
          </TabsTrigger>
          <TabsTrigger
            value="milestones"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Goal className="hidden size-6 sm:inline-block" /> Milestones
          </TabsTrigger>
          <TabsTrigger
            value="awards"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Trophy className="hidden size-6 sm:inline-block" /> Awards
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="data-[state=active]:bg-primary !h-12 text-xs font-semibold data-[state=active]:text-white sm:text-sm"
          >
            <Bookmark className="hidden size-6 sm:inline-block" /> Saves
          </TabsTrigger>
        </TabsList>

        {/* Tipping history */}
        <TabsContent
          value="history"
          className="space-y-4"
        >
          <div className="border-primary bg-secondary/20 rounded-md border p-4">
            {selectedEvent && (
              <EventSummaryCard
                name={selectedEvent.eventName}
                date={selectedEvent.eventDate}
                total={selectedEvent.totalTipped}
                iTipped={selectedEvent.rating}
              />
            )}

            {/* Profile characters */}
            <div className="mt-4 max-h-[45vh] space-y-4 overflow-y-auto">
              {selectedEvent?.characters?.length ? (
                selectedEvent.characters.map(
                  (char: Character, index: number) => (
                    <ProfileCharacterCard
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

          {/* All events */}
          <Paragraph weight="bold">All Events</Paragraph>
          <div className="space-y-4">
            {events.map((item, index) => (
              <ProfileEventCard
                key={index}
                name={item.eventName}
                date={item.eventDate}
                rating={item.rating}
                price={item.totalTipped}
                isActive={selectedEvent?.eventName === item.eventName}
                onSelect={() => setSelectedEvent(item)}
              />
            ))}
          </div>

          {/* Charities */}
          <Charities causes={causes} />
        </TabsContent>

        {/* Milestones */}
        <TabsContent
          value="milestones"
          className="space-y-4"
        >
          <Paragraph weight="bold">Your Milestones</Paragraph>
          <div className="space-y-4">
            {milestonesWithStatus.map((item, index) => (
              <ProfileMilestoneCard
                key={index}
                id={item.id}
                title={item.title}
                description={item.description}
                progress={item.progress}
                status={item.status}
                totalTippedAmount={
                  item.id === "tipper_100"
                    ? Math.max(...events.map(ev => ev.totalTipped))
                    : 0
                }
                extraInfo={item.extraInfo || 0}
              />
            ))}
          </div>

          {/* Charities */}
          <Charities causes={causes} />
        </TabsContent>

        <TabsContent
          value="awards"
          className="space-y-4"
        >
          <Paragraph weight="bold">Your Awards</Paragraph>
          {/* <div className="border-primary w-full space-y-4 rounded-md border bg-white p-6 backdrop-blur-md">
            <div className="mx-auto grid "></div>
          </div> */}
          <div className="border-primary w-full space-y-4 rounded-md border bg-white p-2 backdrop-blur-md sm:p-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {PROFILE_AWARDS.map((item, index) => (
                <ProfileAwardCard
                  key={index}
                  id={item.id}
                  label={item.label}
                  desc={item.desc}
                  isActive={unlockedAwardIds.includes(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Charities */}
          <Charities causes={causes} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
