/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { EventProgressBar } from "./event-progress-bar";
import { EventInfo } from "./event-info";
import { EventCountdown } from "../event-countdown";
import { EventLive } from "./event-live";
import { TipsDrawer } from "./tips-drawer";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";

interface Props {
  eventId: string;
  eventName: string;
  organizationName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  amountToRaise: number;
  amountRaised: number;
  iTipped: number;
  liveVideoLink: string;
  defaultAdminVideo: string;
  eventUrl: string;
  numOfTips: number;
  active_users: number;
  eventCode: string;
  eventSlug: string;
  fullName: string;
  username: string;
  backgroundUrl: string;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  latestTipAmount: number;
  tippingCharacters: any[];
  tipUsageDisclosure: any[];
  liveFullscreen: boolean;
  onToggleFullscreen: (v: boolean) => void;
  frameId: string;
  setLiveFullscreen: (v: boolean) => void;
  status: string;
  venueLocation: string;
  totalAttendees: number;
  openDrawer: boolean;
  setOpenDrawer: (v: boolean) => void;
  onOpenTipDrawer?: () => void;

  characterSets: any[];

  performers: any[];
  currentSessionAmountToRaise?: number;
  channels: any[];
  onChannelCreated?: (channel: EventRoomVideoChannel) => void;
  forceScreenOpen?: boolean;
  isEventOwner: string;
  venueName: string;
  activities: any[];
  eventDescription: string;
  eventBanner: string;
}

export const EventHeader = ({
  eventId,
  eventName,
  organizationName,
  eventDate,
  startTime,
  endTime,
  amountToRaise,
  amountRaised,
  iTipped,
  liveVideoLink,
  defaultAdminVideo,
  eventUrl,
  numOfTips,
  active_users,
  eventCode,
  eventSlug,
  fullName,
  username,
  backgroundUrl,
  hideProgressBarAmount,
  showLatestAmount,
  latestTipAmount,
  tippingCharacters,
  characterSets,
  tipUsageDisclosure,
  liveFullscreen,
  onToggleFullscreen,
  frameId,
  setLiveFullscreen,
  status,
  totalAttendees,
  venueLocation,
  openDrawer,
  setOpenDrawer,
  onOpenTipDrawer,
  performers,
  channels,
  onChannelCreated,
  currentSessionAmountToRaise,
  forceScreenOpen = false,
  isEventOwner,
  venueName,
  activities,
  eventDescription,
  eventBanner,
}: Props) => {
  const [tipsListOpen, setTipsListOpen] = useState(false);

  const safeTippingCharacters = Array.isArray(tippingCharacters)
    ? tippingCharacters
    : [];
  const safeTipUsageDisclosure = Array.isArray(tipUsageDisclosure)
    ? tipUsageDisclosure
    : [];
  const safePerformers = Array.isArray(performers) ? performers : [];
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeCharacterSets = Array.isArray(characterSets) ? characterSets : [];

  console.log("eventBannerFromHeader", eventBanner);

  return (
    <div className="mini-wrapper h-[104px] w-full flex-shrink-0 border-b px-4 py-1 sm:h-32">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <EventInfo
            eventName={eventName}
            organizationName={organizationName}
            eventUrl={eventUrl}
            eventId={eventId}
            amountToRaise={currentSessionAmountToRaise || amountToRaise}
            amountRaised={amountRaised}
            eventCode={eventCode}
            eventSlug={eventSlug}
            backgroundUrl={backgroundUrl}
            hideProgressBarAmount={hideProgressBarAmount}
            showLatestAmount={showLatestAmount}
            latestTipAmount={latestTipAmount}
            tippingCharacters={safeTippingCharacters}
            tipUsageDisclosure={safeTipUsageDisclosure}
            performers={safePerformers}
            defaultScreenOpen={forceScreenOpen}
            venueName={venueName}
            venueLocation={venueLocation}
            activities={activities ?? []}
            eventDescription={eventDescription}
            eventDate={eventDate}
            startTime={startTime}
            endTime={endTime}
            eventBanner={eventBanner}
          />

          <div className="-mt-4 flex items-center gap-2">
            <button
              type="button"
              title="View tips"
              className="mt-4 cursor-pointer text-xs underline-offset-2 hover:underline sm:text-sm"
              onClick={() => setTipsListOpen(true)}
            >
              {numOfTips} Tips
            </button>

            {/* <EventRating iTipped={iTipped} /> */}
            <div className="mt-4 flex items-center gap-1">
              <span className="bg-moonstone-blue size-[14px] rounded-full sm:size-4"></span>{" "}
              <span className="text-xs font-medium sm:text-sm">
                {active_users || 0} online
              </span>
            </div>
          </div>
        </div>

        <EventProgressBar
          eventId={eventId}
          amountToRaise={currentSessionAmountToRaise || amountToRaise}
          amountRaised={amountRaised}
        />

        <div className="flex items-center justify-between">
          <div className="hidden"></div>

          <div className="ml-auto">
            <div className="mt-3 flex items-center justify-between">
              {eventDate ? (
                <EventCountdown
                  startTime={startTime ?? 0}
                  endTime={endTime ?? 0}
                  eventDate={eventDate ?? 0}
                />
              ) : (
                <div style={{ display: "none" }}></div>
              )}
            </div>
          </div>
        </div>

        <div className="-mt-14">
          <EventLive
            liveVideoLink={liveVideoLink}
            defaultAdminVideo={defaultAdminVideo}
            isFullscreen={liveFullscreen}
            onToggleFullscreen={onToggleFullscreen}
            numOfTips={numOfTips}
            eventId={eventId}
            eventName={eventName}
            amountToRaise={amountToRaise}
            amountRaised={amountRaised}
            eventCode={eventCode}
            eventSlug={eventSlug}
            fullName={fullName}
            username={username}
            backgroundUrl={backgroundUrl}
            hideProgressBarAmount={hideProgressBarAmount}
            showLatestAmount={showLatestAmount}
            latestTipAmount={latestTipAmount}
            tippingCharacters={safeTippingCharacters}
            tipUsageDisclosure={safeTipUsageDisclosure}
            organizationName={organizationName}
            frameId={frameId}
            setLiveFullscreen={setLiveFullscreen}
            active_users={active_users}
            status={status}
            eventDate={eventDate}
            startTime={startTime}
            endTime={endTime}
            venueLocation={venueLocation}
            totalAttendees={totalAttendees}
            iTipped={iTipped}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            onOpenTipDrawer={onOpenTipDrawer}
            characterSets={safeCharacterSets}
            channels={safeChannels}
            onChannelCreated={onChannelCreated}
            isEventOwner={isEventOwner}
          />
        </div>
      </div>

      <TipsDrawer
        open={tipsListOpen}
        onOpenChange={setTipsListOpen}
        eventId={eventId}
        channelId={null}
        eventRoomTipCount={numOfTips}
      />
    </div>
  );
};
