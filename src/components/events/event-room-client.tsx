/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Local imports
import { SaveEventId } from "./save-event-id";
import { EventHeader } from "./event-header";
import { EventPusherProvider } from "./event-pusher-provider";
import { Message, RoomCharacter } from "@/types";
import type { UserInfo } from "@/types/tracking.types";
import { usePusherTracking } from "@/hooks/use-pusher-tracking";
import { useTipPresentation } from "@/hooks/use-tip-presentation";
import { isTipCustomizationEnabled } from "@/lib/tip-customization";
import { EventDialog } from "./event-dialog";
import { getEventStatus } from "@/lib/utils";
import { GlobalTipStreamProvider } from "@/providers/global-tip-stream-provider";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { InviteModal } from "./invite-modal";
import { RoomMessages } from "./room-messages";
import { EventFooter } from "./event-footer";
import { StripeProvider } from "./stripe-provider";
import type { EventRoomVideoChannel } from "@/types/event-room-channel.types";
import { mergeEventRoomChannel } from "@/lib/content-channel-payload";
import { useEventChannelCreatedRealtime } from "@/hooks/use-event-channel-created-realtime";
import { useDefaultChannelRealtime } from "@/hooks/use-default-channel-realtime";

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
  timeZone?: string;
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
  venueName?: string;
  venueLocation: string;
  activities: any[];
  eventDescription?: string;
  totalAttendees: number;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  initialLatestTipAmount: number;
  tipUsageDisclosure: any[];
  eventUrl: string;
  isEventOwner: string;
  performers: any[];
  projects: any[];
  contributionType: string;
  channels: any[];
  EventSession: any[];
  eventEventType?: string;
  forceScreenOpen?: boolean;
}

const HYDRATE_USER_PLACEHOLDER: UserInfo = {
  id: "__hydrating__",
  type: "anonymous",
  username: "Anonymous User",
  isAuthenticated: false,
};

export const getCurrentUser = (): UserInfo | null => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("currentUser");
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed
      ) {
        return parsed as UserInfo;
      }
    } catch {
      console.error("[EventRoom] getCurrentUser: invalid stored user JSON");
      localStorage.removeItem("currentUser");
    }
  }

  const newUser: UserInfo = {
    id: `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: "anonymous",
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
  timeZone,
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
  venueName,
  venueLocation,
  totalAttendees,
  hideProgressBarAmount,
  showLatestAmount,
  initialLatestTipAmount,
  tipUsageDisclosure,
  eventUrl,
  isEventOwner,
  performers,
  projects,
  contributionType,
  channels,
  EventSession,
  eventEventType,
  forceScreenOpen = false,
  activities,
  eventDescription,
}: Props) => {
  void eventBanner;

  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeTippingCharacters = Array.isArray(tippingCharacters)
    ? tippingCharacters
    : [];
  const safeChannels = Array.isArray(channels) ? channels : [];
  const [channelList, setChannelList] = useState<EventRoomVideoChannel[]>(() =>
    safeChannels.map(c => ({
      id: String(c.id),
      url: String(c.url ?? ""),
      title: typeof c.title === "string" ? c.title : undefined,
      isDefault: c.isDefault === true,
      durationSeconds:
        typeof c.durationSeconds === "number" ? c.durationSeconds : undefined,
    }))
  );

  const serverChannelKey = safeChannels.map(c => String(c.id)).join(",");
  useEffect(() => {
    setChannelList(
      safeChannels.map(c => ({
        id: String(c.id),
        url: String(c.url ?? ""),
        title: typeof c.title === "string" ? c.title : undefined,
        isDefault: c.isDefault === true,
        durationSeconds:
          typeof c.durationSeconds === "number" ? c.durationSeconds : undefined,
      }))
    );
  }, [serverChannelKey, safeChannels]);

  const handleChannelCreated = useCallback((row: EventRoomVideoChannel) => {
    setChannelList(prev => mergeEventRoomChannel(prev, row));
  }, []);

  useEventChannelCreatedRealtime(eventId, handleChannelCreated);

  useDefaultChannelRealtime(eventId, payload => {
    setChannelList(prev =>
      prev.map(c => ({
        ...c,
        isDefault: String(c.id) === payload.channelId,
      }))
    );
  });

  const safeEventSession = Array.isArray(EventSession) ? EventSession : [];

  const rawCharacterSets = Array.isArray(characterSets) ? characterSets : [];

  const {
    strip: tipStripCharacters,
    quoteCtx: tipQuoteCtx,
    textUnitPrice: tipTextUnitPrice,
    sectionCtaLabel: tipSectionCtaLabel,
    payLabel: tipPayLabel,
  } = useTipPresentation(eventId, safeTippingCharacters as RoomCharacter[], {
    quoteLock: isTipCustomizationEnabled(),
    paymentSurface: "event_room",
  });

  const footerCharacterSets = rawCharacterSets;

  const [liveMessages, setLiveMessages] = useState<Message[]>(safeMessages);

  useEffect(() => {
    setLiveMessages(safeMessages);
    // Intentionally only when switching rooms — live updates append via Pusher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const [screenSettings, setScreenSettings] = useState({
    eventBackground,
    hideProgressBarAmount,
    showLatestAmount,
    tipUsageDisclosure,
    performers,
  });

  const [openDrawer, setOpenDrawer] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = `just_joined_as_cohost_${eventId}`;
    const justJoined = localStorage.getItem(storageKey);

    if (justJoined === "true") {
      localStorage.removeItem(storageKey);
    }
  }, [eventId]);

  const searchParams = useSearchParams();
  const router = useRouter();

  const inviteToken = searchParams.get("inviteToken");

  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "validating" | "invalid" | "valid"
  >("idle");

  const [, setInviteData] = useState<any>(null);
  const [showInviteSignIn, setShowInviteSignIn] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;

    const validate = async () => {
      try {
        setInviteStatus("validating");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/cohost/invite/validate?token=${inviteToken}`
        );
        const data = await res.json();

        if (cancelled) return;
        setInviteData(data);
        setInviteStatus("valid");
      } catch {
        if (!cancelled) setInviteStatus("invalid");
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const { user } = useSelector((state: RootState) => state.auth);
  useEffect(() => {
    if (!inviteToken) return;
    if (inviteStatus !== "valid") return;

    if (!user) {
      setShowInviteSignIn(true);
      return;
    }

    // Signed-in users must finish cohost verification on the invite page (accept only emails a code).
    router.replace(`/invite?token=${encodeURIComponent(inviteToken)}`);
  }, [inviteToken, inviteStatus, user, router]);

  const [currentUser, setCurrentUser] = useState<UserInfo>(
    () => getCurrentUser() ?? HYDRATE_USER_PLACEHOLDER
  );

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setCurrentUser(u);
  }, []);

  const { activeUsers, trackActivity, leaveEvent } = usePusherTracking({
    eventId,
    userInfo: currentUser,
  });

  const active_users = Array.isArray(activeUsers) ? activeUsers.length : 0;

  useEffect(() => {
    trackActivity("viewing_event");

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        trackActivity("viewing_event");
      } else {
        trackActivity("background_tab");
      }
    };

    const handleBeforeUnload = () => {
      trackActivity("leaving_event");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      leaveEvent();
    };
  }, [trackActivity, leaveEvent]);

  const [currentAmountRaised, setCurrentAmountRaised] =
    useState(initialAmountRaised);
  const [currentNumOfTips, setCurrentNumOfTips] = useState(initialNumOfTips);
  const [currentLatestTipAmount, setCurrentLatestTipAmount] = useState(
    initialLatestTipAmount
  );

  const [currentSessionAmountToRaise, setCurrentSessionAmountToRaise] =
    useState(safeEventSession[0]?.amountToRaise);

  const handleAmountUpdated = useCallback(
    (data: { amountRaised?: number; numOfTips?: number }) => {
      if (typeof data.amountRaised === "number")
        setCurrentAmountRaised(data.amountRaised);
      if (typeof data.numOfTips === "number")
        setCurrentNumOfTips(data.numOfTips);
    },
    []
  );

  const handleLatestTipUpdated = useCallback((latestTipAmount: number) => {
    setCurrentLatestTipAmount(latestTipAmount);
  }, []);

  const handleSessionActivated = useCallback((amountToRaise: number) => {
    setCurrentSessionAmountToRaise(amountToRaise);
  }, []);

  const handleScreenSettingsUpdated = useCallback(
    (data: {
      eventBackground: string;
      hideProgressBarAmount: boolean;
      showLatestAmount: boolean;
      tipUsageDisclosure: unknown[];
      performers: unknown[];
    }) => {
      setScreenSettings({
        eventBackground: data.eventBackground,
        hideProgressBarAmount: data.hideProgressBarAmount,
        showLatestAmount: data.showLatestAmount,
        tipUsageDisclosure: data.tipUsageDisclosure as any[],
        performers: data.performers as any[],
      });
    },
    []
  );

  const handleNewChatMessage = useCallback((message: Message) => {
    setLiveMessages(prev => [...prev, message]);
  }, []);

  const [liveFullscreen, setLiveFullscreen] = useState(false);

  const [hasSeenDialog, setHasSeenDialog] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`seenEventDialog-${eventId}`);
    if (seen === "true") {
      setHasSeenDialog(true);
    }
  }, [eventId]);

  const markDialogAsSeen = () => {
    localStorage.setItem(`seenEventDialog-${eventId}`, "true");
    setHasSeenDialog(true);
  };

  const [enableStripe, setEnableStripe] = useState(false);

  useEffect(() => {
    if (openDrawer) setEnableStripe(true);
  }, [openDrawer]);
  const footerAnchorRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = footerAnchorRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setEnableStripe(true);
    }
  }, []);

  useEffect(() => {
    const onActivate = () => setEnableStripe(true);
    document.addEventListener("pointerdown", onActivate, {
      once: true,
      capture: true,
    });
    document.addEventListener("keydown", onActivate, {
      once: true,
      capture: true,
    });
    const t = window.setTimeout(onActivate, 8000);
    return () => {
      document.removeEventListener("pointerdown", onActivate, {
        capture: true,
      });
      document.removeEventListener("keydown", onActivate, { capture: true });
      window.clearTimeout(t);
    };
  }, []);

  if (inviteToken && inviteStatus === "validating") {
    return <div>Validating invite...</div>;
  }

  const status = getEventStatus(eventDate, startTime, endTime);

  const defaultChannel = channelList.find(channel => channel.isDefault);

  const liveVideoUrl = defaultChannel?.url || liveVideoLink;

  const handleInviteAfterLogin = async () => {
    if (!inviteToken) return;

    await fetch(`/cohost/invite/accept`, {
      method: "POST",
      body: JSON.stringify({ token: inviteToken }),
    });

    router.replace(`/room/${eventId}`);
  };

  return (
    <GlobalTipStreamProvider
      eventId={eventId}
      surface="event_room"
    >
      <EventPusherProvider
        eventId={eventId}
        onAmountUpdated={handleAmountUpdated}
        onLatestTipUpdated={handleLatestTipUpdated}
        onSessionActivated={handleSessionActivated}
        onScreenSettingsUpdated={handleScreenSettingsUpdated}
        onNewChatMessage={handleNewChatMessage}
      >
        <main className="relative flex h-[100svh] flex-col overflow-hidden">
          <SaveEventId eventId={eventId} />

          {inviteStatus === "invalid" && (
            <InviteModal
              open={showInviteSignIn}
              onClose={() => setShowInviteSignIn(false)}
              onSuccess={handleInviteAfterLogin}
            />
          )}

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
            tippingCharacters={tipStripCharacters}
            tipUsageDisclosure={screenSettings.tipUsageDisclosure}
            liveFullscreen={liveFullscreen}
            setLiveFullscreen={setLiveFullscreen}
            onToggleFullscreen={setLiveFullscreen}
            frameId={defaultChannel?.id ?? ""}
            channels={channelList}
            onChannelCreated={handleChannelCreated}
            status={status}
            venueLocation={venueLocation}
            totalAttendees={totalAttendees}
            openDrawer={openDrawer}
            setOpenDrawer={setOpenDrawer}
            characterSets={footerCharacterSets}
            performers={screenSettings.performers}
            currentSessionAmountToRaise={currentSessionAmountToRaise}
            forceScreenOpen={forceScreenOpen}
            isEventOwner={isEventOwner}
            eventBanner={eventBanner}
            venueName={venueName ?? ""}
            activities={activities ?? []}
            eventDescription={eventDescription ?? ""}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <RoomMessages
              eventId={eventId}
              eventName={eventName}
              hostName={hostName}
              organizationName={organizationName}
              messages={liveMessages}
              tippingCharacters={tipStripCharacters}
              iTipped={iTipped}
              channels={channelList}
              frameId={defaultChannel?.id ?? ""}
              isEventOwner={isEventOwner}
              liveVideoLink={liveVideoLink}
              onChannelCreated={handleChannelCreated}
              performers={screenSettings.performers}
              projects={projects}
              contributionType={contributionType}
              eventEventType={eventEventType}
              eventDate={eventDate}
              startTime={startTime}
              endTime={endTime}
              timeZone={timeZone}
              eventBanner={eventBanner}
              venueName={venueName}
              venueLocation={venueLocation}
              activities={activities}
              eventDescription={eventDescription}
            />
          </div>

          <div
            ref={footerAnchorRef}
            className="w-full flex-shrink-0"
          >
            <StripeProvider
              enabled={enableStripe}
              tippingCharacters={tipStripCharacters}
              textTipUnitPrice={tipTextUnitPrice}
            >
              <EventFooter
                eventId={eventId}
                tippingCharacters={tipStripCharacters}
                characterSets={footerCharacterSets}
                performers={performers}
                textTipUnitPrice={tipTextUnitPrice}
                sectionCtaLabel={tipSectionCtaLabel}
                payLabel={tipPayLabel}
                tipQuoteContext={tipQuoteCtx}
              />
            </StripeProvider>
          </div>

          {status === "Not started" &&
            eventDate &&
            !liveFullscreen &&
            !hasSeenDialog && (
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
        </main>
      </EventPusherProvider>
    </GlobalTipStreamProvider>
  );
};
