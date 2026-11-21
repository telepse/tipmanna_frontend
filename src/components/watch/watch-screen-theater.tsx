"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { ScreenDisplayHud } from "@/components/events/screen-display-hud";
import { NativeVideo } from "@/components/native-video";
import { SCREEN_BACKGROUNDS } from "@/lib/backgrounds";
import { pinnedForScreenDisplay } from "@/lib/event-pin-roster";
import { preloadPaymentAnimationAssetsForCharacters } from "@/lib/preload-payment-animations";
import { normalizeScreenFunnelPosition } from "@/lib/screen-funnel-position";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import { RoomCharacter } from "@/types";
import { Performer } from "@/types/performer.types";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import {
  useScreenOverlayPublicSync,
  type ScreenOverlayLiveState,
} from "@/hooks/use-screen-overlay-public-sync";
import { GlobalTipStreamProvider } from "@/providers/global-tip-stream-provider";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";

function getLightboxVideoSrc(bg: string): string {
  switch (bg) {
    case "/gaming.png":
      return "/gaming.mp4";
    case "/islamic.png":
      return "/islamic.mp4";
    default:
      return "/default.mp4";
  }
}

export type WatchScreenTheaterProps = {
  eventId: string;
  eventName: string;
  eventCode: string;
  eventSlug: string;
  amountToRaise: number;
  initialAmountRaised: number;
  initialLatestTipAmount: number;
  eventBackground: string;
  hideProgressBarAmount: boolean;
  showLatestAmount: boolean;
  tipUsageDisclosure: TipUsageDisclosure[];
  tippingCharacters: RoomCharacter[];
  performers?: Performer[];
  projects?: Array<{
    id?: string;
    name: string;
    amountReceived?: string | number;
  }>;
  contributionType?: string;
  showPinnedOnScreen?: boolean;
  funnelPosition?: string;
};

export function WatchScreenTheater(props: WatchScreenTheaterProps) {
  return (
    <GlobalTipStreamProvider
      eventId={props.eventId}
      enabled
      surface="screen_display"
    >
      <WatchScreenTheaterInner {...props} />
    </GlobalTipStreamProvider>
  );
}

function WatchScreenTheaterInner({
  eventId,
  eventName,
  eventCode,
  eventSlug,
  amountToRaise: initialAmountToRaise,
  initialAmountRaised,
  initialLatestTipAmount,
  eventBackground: initialBackground,
  hideProgressBarAmount: initialHideProgress,
  showLatestAmount: initialShowLatest,
  tipUsageDisclosure: initialDisclosures,
  tippingCharacters,
  performers: initialPerformers,
  projects: initialProjects,
  contributionType = "PERFORMER",
  showPinnedOnScreen: initialShowPinned = true,
  funnelPosition: initialFunnelRaw,
}: WatchScreenTheaterProps) {
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null);
  const [amountToRaise, setAmountToRaise] = useState(initialAmountToRaise);
  const [amountRaised, setAmountRaised] = useState(initialAmountRaised);
  const [latestTipAmount, setLatestTipAmount] = useState(
    initialLatestTipAmount
  );
  const [eventBackground, setEventBackground] = useState(initialBackground);
  const [hideProgressBarAmount, setHideProgressBarAmount] =
    useState(initialHideProgress);
  const [showLatestAmount, setShowLatestAmount] = useState(initialShowLatest);
  const [tipUsageDisclosure, setTipUsageDisclosure] =
    useState<TipUsageDisclosure[]>(initialDisclosures);
  const [performers, setPerformers] = useState(initialPerformers ?? []);
  const [projects, setProjects] = useState(initialProjects ?? []);
  const [showPinnedOnScreen, setShowPinnedOnScreen] =
    useState(initialShowPinned);
  const [funnelPosition, setFunnelPosition] = useState(
    normalizeScreenFunnelPosition(initialFunnelRaw)
  );
  const [animateTip, setAnimateTip] = useState(false);
  const [showPinnedPerformers, setShowPinnedPerformers] = useState(true);

  const onPublicPatch = useCallback(
    (patch: Partial<ScreenOverlayLiveState>) => {
      if (typeof patch.amountToRaise === "number") {
        setAmountToRaise(patch.amountToRaise);
      }
      if (typeof patch.amountRaised === "number") {
        setAmountRaised(patch.amountRaised);
      }
      if (typeof patch.latestTipAmount === "number") {
        setLatestTipAmount(patch.latestTipAmount);
      }
      if (patch.eventBackground !== undefined) {
        setEventBackground(patch.eventBackground ?? "/default.png");
      }
      if (typeof patch.hideProgressBarAmount === "boolean") {
        setHideProgressBarAmount(patch.hideProgressBarAmount);
      }
      if (typeof patch.showLatestAmount === "boolean") {
        setShowLatestAmount(patch.showLatestAmount);
      }
      if (Array.isArray(patch.tipUsageDisclosure)) {
        setTipUsageDisclosure(patch.tipUsageDisclosure as TipUsageDisclosure[]);
      }
      if (Array.isArray(patch.performers)) {
        setPerformers(patch.performers as Performer[]);
      }
      if (Array.isArray(patch.projects)) {
        setProjects(
          patch.projects as Array<{
            id?: string;
            name: string;
            amountReceived?: string | number;
          }>
        );
      }
      if (typeof patch.showPinnedOnScreen === "boolean") {
        setShowPinnedOnScreen(patch.showPinnedOnScreen);
      }
      if (patch.funnelPosition) {
        setFunnelPosition(normalizeScreenFunnelPosition(patch.funnelPosition));
      }
    },
    []
  );

  useScreenOverlayPublicSync(eventId, onPublicPatch);

  useEffect(() => {
    tracePaymentAnimation({
      stage: "screen_display_ready",
      surface: "screen_display",
      eventId,
      isOpen: true,
      streamEnabled: true,
      queueEnabled: true,
    });
  }, [eventId]);

  useEffect(() => {
    setAnimateTip(true);
    const timer = setTimeout(() => setAnimateTip(false), 5000);
    return () => clearTimeout(timer);
  }, [amountRaised]);

  const safeTippingCharacters = useMemo(
    () => (Array.isArray(tippingCharacters) ? tippingCharacters : []),
    [tippingCharacters]
  );

  usePaymentAnimationPlayer({
    eventId,
    characters: safeTippingCharacters,
    enabled: true,
    playbackKeyPrefix: "screen-",
    surface: "screen_display",
  });

  useEffect(() => {
    if (!tippingCharacters?.length) return;
    preloadPaymentAnimationAssetsForCharacters(tippingCharacters);
  }, [tippingCharacters]);

  const backgroundToUse = eventBackground || "/default.png";
  const activeBg = SCREEN_BACKGROUNDS.find(bg => bg.url === backgroundToUse);
  const textColor = activeBg?.textColor || "text-white";
  const showLatest = showLatestAmount ?? false;
  const shouldShowProgressAmounts = !hideProgressBarAmount;
  const progress =
    amountToRaise > 0 ? Math.min((amountRaised / amountToRaise) * 100, 100) : 0;

  const pinnedDisplayItems = useMemo(() => {
    const source = contributionType === "PROJECT" ? projects : performers;
    return pinnedForScreenDisplay(source ?? []);
  }, [contributionType, performers, projects]);

  const scanLink = getPublicAbsoluteUrl(
    `/join-host/${eventSlug}?eventCode=${encodeURIComponent(eventCode)}`
  );

  const responsiveStyles = {
    titleSize: "text-5xl",
    headingSize: "text-3xl",
    qrSize: 110,
    gap: "gap-8",
    padding: "p-6 lg:p-8",
    progressBarHeight: "h-4 lg:h-10",
    funnelSize: "size-20 lg:size-24",
    progressWidth: "max-w-xl lg:max-w-2xl",
  };

  useEffect(() => {
    const el = lightboxVideoRef.current;
    if (!el) return;
    el.src = getLightboxVideoSrc(backgroundToUse);
    void el.play().catch(() => undefined);
  }, [backgroundToUse]);

  return (
    <div
      id="payment-animation-root"
      className={`${OVERLAY_Z_INDEX} relative flex min-h-0 flex-1 flex-col`}
    >
      <Link
        href="/watch/screen"
        className="absolute top-[2vmin] right-[2vmin] z-50 rounded bg-black/60 px-4 py-2 text-[2vmin] text-white hover:bg-black/80"
      >
        Change event
      </Link>
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
        <NativeVideo
          ref={lightboxVideoRef}
          loop
          muted
          className="absolute top-0 left-0 z-[-1] h-full w-full object-cover"
        />
        <div
          id="global-animation-layer"
          className={`pointer-events-none absolute inset-0 ${OVERLAY_Z_INDEX}`}
        />
        <ScreenDisplayHud
          variant="opaque"
          amountToRaise={amountToRaise}
          amountRaised={amountRaised}
          eventName={eventName}
          showLatest={showLatest}
          latestTipAmount={latestTipAmount}
          shouldShowProgressAmounts={shouldShowProgressAmounts}
          showRaisedAmount
          textColor={textColor}
          progress={progress}
          animateTip={animateTip}
          tipUsageDisclosure={tipUsageDisclosure}
          contributionType={contributionType}
          pinnedDisplayItems={pinnedDisplayItems}
          showPinnedOnScreen={showPinnedOnScreen}
          funnelPosition={funnelPosition}
          scanLink={scanLink}
          isMobile={false}
          isLandscape={true}
          responsiveStyles={responsiveStyles}
          showPinnedPerformers={showPinnedPerformers}
          onTogglePinnedPerformers={() =>
            setShowPinnedPerformers(prev => !prev)
          }
        />
      </div>
    </div>
  );
}
