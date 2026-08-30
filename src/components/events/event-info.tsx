/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

// Third-party imports
import {
  Check,
  CircleAlert,
  Info,
  Link,
  Share2,
  TvMinimalPlay,
} from "lucide-react";
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  FacebookIcon,
  LinkedinIcon,
  TwitterIcon,
  WhatsappIcon,
} from "next-share";

// Local imports
import { truncateText } from "@/lib/utils";
import { ScreenDisplay } from "./screen-display";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { Dialog, DialogContent } from "../ui/dialog";
import Image from "next/image";
import { EventDetailDialog } from "./event-detail-dialog";

interface Props {
  eventName: string;
  organizationName: string;
  eventUrl: string;
  eventId: string;
  amountToRaise: number;
  amountRaised: number;
  eventCode: string;
  eventSlug: string;
  backgroundUrl: string;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  latestTipAmount: number;
  tippingCharacters: any[];
  tipUsageDisclosure: any[];
  performers: any[];
  defaultScreenOpen?: boolean;
  venueName: string;
  venueLocation: string;
  activities: any[];
  eventDescription: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  eventBanner: string;
}

export const EventInfo = ({
  eventName,
  organizationName,
  eventUrl,
  eventId,
  amountToRaise,
  amountRaised,
  eventCode,
  eventSlug,
  backgroundUrl,
  hideProgressBarAmount,
  showLatestAmount,
  latestTipAmount,
  tippingCharacters,
  tipUsageDisclosure,
  performers,
  defaultScreenOpen = false,
  venueName,
  venueLocation,
  activities,
  eventDescription,
  eventDate,
  startTime,
  endTime,
  eventBanner,
}: Props) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);

  console.log("eventBannerFromINFO", eventBanner);

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : getPublicAbsoluteUrl(`/room/${eventId}`);
  const shareTitle = `Check out ${eventName} by ${organizationName}`;
  const shareBody = `Join me at ${eventName} organized by ${organizationName}. Don't miss out!`;

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = eventUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [openEventDetail, setOpenEventDetail] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <h5 className="font-semibold">{truncateText(eventName, 12)}</h5>

      <div className="relative flex items-center gap-2">
        <Info
          onClick={() => {
            setOpenEventDetail(prev => !prev);
            setShowShare(false);
          }}
          className="size-4 cursor-pointer"
        />
        <ScreenDisplay
          eventId={eventId}
          eventName={eventName}
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
          performers={performers}
          defaultOpen={defaultScreenOpen}
        >
          <TvMinimalPlay className="size-4 sm:size-7" />
        </ScreenDisplay>{" "}
        {/* Share Button */}
        <Share2
          className="size-4 cursor-pointer transition-colors hover:text-green-600"
          onClick={() => {
            setShowShare(prev => !prev);
            setShowInfo(false); // Close info when opening share
          }}
        />
        {/* Social Share Options */}
        {showShare && (
          <div className="absolute top-1/2 left-full z-[100] mt-2 -translate-y-1/2 rounded-md border bg-white p-2 shadow-md">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="mb-1 text-xs font-semibold">Share Event</p>
                <span onClick={() => setShowShare(prev => !prev)}>x</span>
              </div>

              <div className="flex items-center gap-2">
                {copied ? (
                  <>
                    <Check className="text-moonstone-blue size-3" />
                  </>
                ) : (
                  <>
                    <Link
                      className="size-4"
                      onClick={handleCopyLink}
                    />
                  </>
                )}
                <WhatsappShareButton
                  url={eventUrl}
                  title={shareTitle}
                  separator=": "
                >
                  <WhatsappIcon
                    size={24}
                    round
                  />
                </WhatsappShareButton>

                <FacebookShareButton
                  url={eventUrl}
                  quote={shareBody}
                  hashtag={`#${organizationName.replace(/\s+/g, "")}`}
                >
                  <FacebookIcon
                    size={24}
                    round
                  />
                </FacebookShareButton>

                <TwitterShareButton
                  url={eventUrl}
                  title={shareTitle}
                >
                  <TwitterIcon
                    size={24}
                    round
                  />
                </TwitterShareButton>

                <LinkedinShareButton
                  url={eventUrl}
                  title={eventName}
                  summary={shareBody}
                  source={organizationName}
                >
                  <LinkedinIcon
                    size={24}
                    round
                  />
                </LinkedinShareButton>
              </div>
            </div>
          </div>
        )}
        {openEventDetail && (
          <EventDetailDialog
            eventBanner={eventBanner}
            eventName={eventName}
            eventDescription={eventDescription}
            venueName={venueName}
            venueLocation={venueLocation}
            eventDate={eventDate}
            startTime={startTime}
            endTime={endTime}
            activities={activities}
            open={openEventDetail}
            onOpenChange={open => setOpenEventDetail(open)}
          />
        )}
      </div>
    </div>
  );
};
