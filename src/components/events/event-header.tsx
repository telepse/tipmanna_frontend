/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventProgressBar } from "./event-progress-bar";
import { EventInfo } from "./event-info";
import { EventCountdown } from "../event-countdown";
import { EventLive } from "./event-live";

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
  channels: any[];
  status: string;
  venueLocation: string;
  totalAttendees: number;
  tipperEvents: any[];
  tipperTotal: number;
  causes: any[];
  openDrawer: boolean;
  setOpenDrawer: (v: boolean) => void;

  characterSets: any[];

  contents: any[];
  tippers: any[];
  latestContents: any[];
  mostTippedContents: any[];
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
  channels,
  status,
  totalAttendees,
  venueLocation,
  tipperEvents,
  tipperTotal,
  causes,
  openDrawer,
  setOpenDrawer,
  contents,
  tippers,
  latestContents,
  mostTippedContents,
}: Props) => {
  return (
    <div className="mini-wrapper h-[104px] w-full flex-shrink-0 border-b px-4 py-1 sm:h-32">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <EventInfo
            eventName={eventName}
            organizationName={organizationName}
            eventUrl={eventUrl}
            eventId={eventId}
            amountToRaise={amountToRaise}
            amountRaised={amountRaised}
            eventCode={eventCode}
            eventSlug={eventSlug}
            backgroundUrl={backgroundUrl}
            hideProgressBarAmount={hideProgressBarAmount}
            showLatestAmount={showLatestAmount}
            latestTipAmount={latestTipAmount}
            tippingCharacters={tippingCharacters}
            tipUsageDisclosure={tipUsageDisclosure}
          />

          <div className="-mt-4 flex items-center gap-2">
            <span className="mt-4 text-xs sm:text-sm">{numOfTips} Tips</span>

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
          amountToRaise={amountToRaise}
          amountRaised={amountRaised}
        />

        <div className="flex items-center justify-between">
          <div className="hidden"></div>

          <div className="ml-auto">
            <div className="mt-3 flex items-center justify-between">
              <EventCountdown
                startTime={startTime}
                endTime={endTime}
                eventDate={eventDate}
              />
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
            tippingCharacters={tippingCharacters}
            tipUsageDisclosure={tipUsageDisclosure}
            organizationName={organizationName}
            frameId={frameId}
            setLiveFullscreen={setLiveFullscreen}
            active_users={active_users}
            channels={channels}
            status={status}
            eventDate={eventDate}
            startTime={startTime}
            endTime={endTime}
            venueLocation={venueLocation}
            totalAttendees={totalAttendees}
            tipperEvents={tipperEvents}
            tipperTotal={tipperTotal}
            iTipped={iTipped}
            causes={causes}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            characterSets={characterSets}
            contents={contents}
            tippers={tippers}
            latestContents={latestContents}
            mostTippedContents={mostTippedContents}
          />
        </div>
      </div>
    </div>
  );
};
