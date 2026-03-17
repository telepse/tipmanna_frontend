/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Third-party imports
import { LoaderCircle } from "lucide-react";

// Local imports
import { SaveEventId } from "./save-event-id";
import { EventHeader } from "./event-header";
import { RoomMessages, setLastPaymentId } from "./room-messages";
import { StripeProvider } from "./stripe-provider";
import { EventFooter } from "./event-footer";
import { Message, RoomCharacter } from "@/types";
import { usePusherTracking } from "@/hooks/use-pusher-tracking";
import { EventDialog } from "./event-dialog";
import { getEventStatus } from "@/lib/utils";
import { pusherClient } from "@/lib/pusher";

interface Props {
  eventId: string;
  eventName: string;
  organizationName: string;
  hostName: string;
  fullName: string;
  username: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  liveVideoLink: string;
  defaultAdminVideo: string;
  amountToRaise: number;
  initialNumOfTips: number;
  initialAmountRaised: number;
  messages: Message[];
  iTipped: number;
  tippingCharacters: RoomCharacter[];
  characterSets: any;
  eventCode: string;
  eventSlug: string;
  eventBackground: string;
  eventBanner: string;
  venueLocation: string;
  totalAttendees: number;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  initialLatestTipAmount: number;
  tipUsageDisclosure: any[];
  eventUrl: string;
  channels: any[];
  tipperEvents: any[];
  tipperTotal: number;
  causes: any[];
  isEventOwner: string;
  contents: any[];
  tippers: any[];
  latestContents: any[];
  mostTippedContents: any[];
}

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("currentUser");
  if (saved) return JSON.parse(saved);

  const newUser = {
    id: `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: "anonymous" as const,
    username: "Anonymous User",
    isAuthenticated: false,
  };
  localStorage.setItem("currentUser", JSON.stringify(newUser));
  return newUser;
};

export const EventRoomClient = ({
  eventId,
  eventName,
  organizationName,
  hostName,
  fullName,
  username,
  eventDate,
  startTime,
  endTime,
  liveVideoLink,
  defaultAdminVideo,
  amountToRaise,
  initialNumOfTips,
  initialAmountRaised,
  messages,
  iTipped,
  tippingCharacters,
  characterSets,
  eventCode,
  eventSlug,
  eventBackground,
  eventBanner,
  venueLocation,
  totalAttendees,
  hideProgressBarAmount,
  showLatestAmount,
  initialLatestTipAmount,
  tipUsageDisclosure,
  eventUrl,
  channels,
  tipperEvents,
  tipperTotal,
  causes,
  isEventOwner,
  contents,
  tippers,
  latestContents,
  mostTippedContents,
}: Props) => {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeTippingCharacters = Array.isArray(tippingCharacters)
    ? tippingCharacters
    : [];

  const [screenSettings, setScreenSettings] = useState({
    eventBackground,
    hideProgressBarAmount,
    showLatestAmount,
    tipUsageDisclosure,
  });

  const [openDrawer, setOpenDrawer] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const autoOpenLive = searchParams.get("autoOpenLive") === "true";

  const [currentUser] = useState(getCurrentUser);
  const [currentActivity, setCurrentActivity] = useState("viewing_event");

  // Initialize Pusher tracking
  const { activeUsers, trackActivity, leaveEvent } = usePusherTracking({
    eventId,
    userInfo: currentUser,
  });

  // const active_users = activeUsers.length;
  const active_users = Array.isArray(activeUsers) ? activeUsers.length : 0;

  // Track initial page view and set up activity tracking
  useEffect(() => {
    trackActivity("viewing_event");

    // Track when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackActivity(currentActivity);
      } else {
        trackActivity("background_tab");
      }
    };

    // Track page unload
    const handleBeforeUnload = () => {
      // The leave event is handled automatically in the hook cleanup
      trackActivity("leaving_event");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Tell backend user left
      leaveEvent();
    };
  }, [trackActivity, currentActivity, leaveEvent]);

  // Handle activity changes
  const handleActivityChange = (activity: string) => {
    setCurrentActivity(activity);
    trackActivity(activity);
  };

  // Handle section navigation with activity tracking
  const handleNavigateToSection = (section: string, activity: string) => {
    handleActivityChange(activity);
    // Scroll to section or navigate - implement based on your needs
    console.log(`Navigating to ${section}`);
  };

  // useEffect(() => {
  //   const urlToken = searchParams.get("token");
  //   const storedToken = sessionStorage.getItem(`event-token-${eventId}`);

  //   // If tokens don't match or are missing, redirect
  //   if (!urlToken || urlToken !== storedToken) {
  //     setIsRedirecting(true);
  //     const publicHostUrl = `/join-host/${eventSlug}?eventCode=${eventCode}`;
  //     router.replace(publicHostUrl);
  //     return;
  //   }
  // }, [eventId, eventCode, eventSlug, router, searchParams]);

  const [currentAmountRaised, setCurrentAmountRaised] =
    useState(initialAmountRaised);
  const [currentNumOfTips, setCurrentNumOfTips] = useState(initialNumOfTips);
  const [currentLatestTipAmount, setCurrentLatestTipAmount] = useState(
    initialLatestTipAmount
  );

  useEffect(() => {
    if (!eventId) return;

    const publicChannel = pusherClient.subscribe(`event-${eventId}`);
    const privateChannel = pusherClient.subscribe(`private-event-${eventId}`);

    // Sync Financials
    publicChannel.bind(
      "event-amount-updated",
      (data: { amountRaised: number; numOfTips: number }) => {
        if (typeof data.amountRaised === "number")
          setCurrentAmountRaised(data.amountRaised);
        if (typeof data.numOfTips === "number")
          setCurrentNumOfTips(data.numOfTips);
      }
    );

    publicChannel.bind(
      "latest-tip-updated",
      (data: { latestTipAmount: number }) => {
        if (typeof data.latestTipAmount === "number")
          setCurrentLatestTipAmount(data.latestTipAmount);
      }
    );

    // publicChannel.bind_global((event, data) => {
    //   console.log("[PUSHER GLOBAL]", event, data);
    // })

    // Sync Admin/UI Settings
    privateChannel.bind("screen-settings-updated", (data: any) => {
      console.log("🎙️ screen settings", data);

      setScreenSettings({
        eventBackground: data.eventBackground,
        hideProgressBarAmount: data.hideProgressBarAmount,
        showLatestAmount: data.showLatestAmount,
        tipUsageDisclosure: data.tipUsageDisclosure,
      });
    });

    return () => {
      publicChannel.unbind_all();
      privateChannel.unbind_all();
      pusherClient.unsubscribe(`event-${eventId}`);
      pusherClient.unsubscribe(`private-event-${eventId}`);
    };
  }, [eventId, setScreenSettings]);

  useEffect(() => {
    const publicChannel = pusherClient.subscribe(`event-${eventId}`);
    const key = `lastPaymentId-${eventId}`;
    let lastPaymentId = Number(sessionStorage.getItem(key)) || 0;

    const handler = (data: any) => {
      const paymentId = data.id;

      if (paymentId <= lastPaymentId) return;

      lastPaymentId = data.paymentId;
      setLastPaymentId(eventId, lastPaymentId);
      sessionStorage.setItem(key, String(lastPaymentId));

      // playDisplayPaymentAnimation({
      //   animationId: String(data.paymentId),
      //   executionKey: String(data.paymentId),
      //   surface: "payment-event",
      //   factory: createFactoryFromStyle(data),
      // });
    };

    publicChannel.bind("tip-animation", handler);

    return () => {
      publicChannel.unbind("tip-animation", handler);
    };
  }, [eventId]);

  const [liveFullscreen, setLiveFullscreen] = useState(false);

  const [hasSeenDialog, setHasSeenDialog] = useState(false);

  useEffect(() => {
    // Check localStorage on first render
    const seen = localStorage.getItem(`seenEventDialog-${eventId}`);
    if (seen === "true") {
      setHasSeenDialog(true);
    }
  }, [eventId]);

  // Function to mark dialog as seen
  const markDialogAsSeen = () => {
    localStorage.setItem(`seenEventDialog-${eventId}`, "true");
    setHasSeenDialog(true);
  };

  // If redirecting, show loading state
  if (isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="text-primary size-14 animate-spin" />
      </div>
    );
  }

  const status = getEventStatus(eventDate, startTime, endTime);

  // Get default channel in client
  const defaultChannel = channels.find(channel => channel.isDefault);

  const liveVideoUrl = defaultChannel?.url || liveVideoLink;

  return (
    <section className="relative flex h-[100svh] flex-col overflow-hidden">
      <SaveEventId eventId={eventId} />

      {/* Event header */}
      <EventHeader
        eventId={eventId}
        eventName={eventName}
        organizationName={organizationName}
        eventDate={eventDate}
        startTime={startTime}
        endTime={endTime}
        liveVideoLink={liveVideoUrl}
        defaultAdminVideo={defaultAdminVideo}
        amountToRaise={amountToRaise}
        amountRaised={currentAmountRaised}
        iTipped={iTipped}
        eventUrl={eventUrl}
        numOfTips={currentNumOfTips}
        active_users={active_users}
        eventCode={eventCode}
        eventSlug={eventSlug}
        fullName={fullName}
        username={username}
        backgroundUrl={screenSettings.eventBackground}
        hideProgressBarAmount={screenSettings.hideProgressBarAmount}
        showLatestAmount={screenSettings.showLatestAmount}
        latestTipAmount={currentLatestTipAmount}
        tippingCharacters={tippingCharacters}
        tipUsageDisclosure={screenSettings.tipUsageDisclosure}
        liveFullscreen={liveFullscreen}
        setLiveFullscreen={setLiveFullscreen}
        onToggleFullscreen={setLiveFullscreen}
        frameId={defaultChannel?.id}
        channels={channels}
        status={status}
        venueLocation={venueLocation}
        totalAttendees={totalAttendees}
        tipperEvents={tipperEvents}
        tipperTotal={tipperTotal}
        causes={causes}
        openDrawer={openDrawer}
        setOpenDrawer={setOpenDrawer}
        characterSets={characterSets}
        contents={contents}
        tippers={tippers}
        latestContents={latestContents}
        mostTippedContents={mostTippedContents}
      />

      {/* Scrollable chat area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <RoomMessages
          eventId={eventId}
          eventName={eventName}
          hostName={hostName}
          organizationName={organizationName}
          initialMessages={safeMessages}
          tippingCharacters={safeTippingCharacters}
          iTipped={iTipped}
          channels={channels}
          frameId={defaultChannel?.id}
          isEventOwner={isEventOwner}
          liveVideoLink={liveVideoLink}
        />
      </div>

      <StripeProvider tippingCharacters={safeTippingCharacters}>
        <EventFooter
          eventId={eventId}
          tippingCharacters={safeTippingCharacters}
          characterSets={characterSets}
        />
      </StripeProvider>

      {status === "Not started" && !liveFullscreen && !hasSeenDialog && (
        <EventDialog
          eventId={eventId}
          eventName={eventName}
          eventDate={eventDate}
          startTime={startTime}
          endTime={endTime}
          venueLocation={venueLocation}
          organizationName={organizationName}
          hostName={fullName}
          totalAttendees={totalAttendees}
          onClose={markDialogAsSeen}
        />
      )}
    </section>
  );
};
