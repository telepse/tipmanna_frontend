"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NativeVideo } from "@/components/native-video";

// Third-party imports
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";
import { ScreenDisplayHud } from "@/components/events/screen-display-hud";
import {
  normalizeScreenFunnelPosition,
  type ScreenFunnelPosition,
} from "@/lib/screen-funnel-position";

// Local imports
import { SCREEN_BACKGROUNDS } from "@/lib/backgrounds";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import { RoomCharacter } from "@/types";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useScreenDetection } from "@/hooks/use-screen-detection";
import { usePaymentAnimationPlayer } from "@/hooks/use-payment-animation-player";
import { preloadPaymentAnimationAssetsForCharacters } from "@/lib/preload-payment-animations";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { Performer } from "@/types/performer.types";
import { tracePaymentAnimation } from "@/lib/payment-animation-trace";
import { pinnedForScreenDisplay } from "@/lib/event-pin-roster";

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

interface ScreenDisplayProps {
  amountToRaise: number;
  amountRaised: number;
  eventName: string;
  eventId: string;
  eventCode: string;
  eventSlug: string;
  backgroundUrl?: string;
  showLatestAmount?: boolean;
  latestTipAmount?: number;
  hideProgressBarAmount?: boolean;
  tipUsageDisclosure?: TipUsageDisclosure[] | undefined;
  tippingCharacters?: RoomCharacter[] | undefined;
  performers?: Performer[];
  projects?: Array<{
    id?: string;
    name: string;
    amountReceived?: string | number;
  }>;
  contributionType?: string;
  children: React.ReactNode;
  /** Open fundraise / screen display lightbox on mount (e.g. /room/:id/screen). */
  defaultOpen?: boolean;
  /** When false, hide amount-raised UI on this surface. */
  showAmountRaisedOnVideos?: boolean;
  /** When true, show view count if provided. */
  showViewCountOnVideos?: boolean;
  viewCount?: number;
  showPinnedOnScreen?: boolean;
  funnelPosition?: ScreenFunnelPosition;
}

export const ScreenDisplay = ({
  amountToRaise,
  amountRaised,
  eventName,
  eventId,
  eventCode,
  eventSlug,
  children,
  backgroundUrl: backgroundUrlProp,
  showLatestAmount,
  latestTipAmount,
  hideProgressBarAmount,
  tipUsageDisclosure,
  tippingCharacters,
  performers,
  projects,
  contributionType = "PERFORMER",
  defaultOpen = false,
  showAmountRaisedOnVideos = true,
  showViewCountOnVideos = false,
  viewCount,
  showPinnedOnScreen = true,
  funnelPosition: funnelPositionProp,
}: ScreenDisplayProps) => {
  const funnelPosition = normalizeScreenFunnelPosition(
    funnelPositionProp ?? "bottom_left"
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  const backgroundUrl = backgroundUrlProp ?? "/default.png";
  const showLatest = showLatestAmount ?? false;
  const shouldShowProgressAmounts = !hideProgressBarAmount;
  const showRaisedAmount = showAmountRaisedOnVideos !== false;

  const { isLandscape, isMobile, isDesktop } = useScreenDetection();
  const { isSupported: isWakeLockSupported } = useWakeLock({ enabled: isOpen });

  const prevOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevOpenRef.current === isOpen) return;
    if (isOpen) {
      tracePaymentAnimation({
        stage: "screen_display_reopen_started",
        surface: "screen_display",
        eventId,
        isOpen: true,
        streamEnabled: true,
        queueEnabled: true,
      });
      tracePaymentAnimation({
        stage: "screen_display_stream_enabled",
        surface: "screen_display",
        eventId,
        isOpen: true,
        streamEnabled: true,
      });
      tracePaymentAnimation({
        stage: "screen_display_queue_enabled",
        surface: "screen_display",
        eventId,
        isOpen: true,
        queueEnabled: true,
      });
      tracePaymentAnimation({
        stage: "screen_display_reopen_ready",
        surface: "screen_display",
        eventId,
        isOpen: true,
        streamEnabled: true,
        queueEnabled: true,
        handlerBound: true,
      });
      tracePaymentAnimation({
        stage: "screen_display_ready",
        surface: "screen_display",
        eventId,
        isOpen: true,
        streamEnabled: true,
        queueEnabled: true,
        handlerBound: true,
      });
    } else {
      tracePaymentAnimation({
        stage: "screen_display_stream_disabled",
        surface: "screen_display",
        eventId,
        isOpen: false,
        streamEnabled: false,
      });
      tracePaymentAnimation({
        stage: "screen_display_queue_flushed",
        surface: "screen_display",
        eventId,
        isOpen: false,
        queueEnabled: false,
      });
      tracePaymentAnimation({
        stage: "screen_display_closed",
        surface: "screen_display",
        eventId,
        isOpen: false,
        streamEnabled: false,
        queueEnabled: false,
        handlerBound: false,
      });
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, eventId]);

  const safeTippingCharacters = useMemo(
    () => (Array.isArray(tippingCharacters) ? tippingCharacters : []),
    [tippingCharacters]
  );

  const pinnedDisplayItems = useMemo(() => {
    const source = contributionType === "PROJECT" ? projects : performers;
    return pinnedForScreenDisplay(source ?? []);
  }, [contributionType, performers, projects]);

  usePaymentAnimationPlayer({
    eventId,
    characters: safeTippingCharacters,
    enabled: isOpen,
    playbackKeyPrefix: "screen-",
    surface: "screen_display",
  });

  useEffect(() => {
    if (!tippingCharacters?.length) return;
    preloadPaymentAnimationAssetsForCharacters(tippingCharacters);
  }, [tippingCharacters]);

  const DEFAULT_BG = "/default.png";
  const backgroundToUse = backgroundUrl || DEFAULT_BG;
  const activeBg = SCREEN_BACKGROUNDS.find(bg => bg.url === backgroundToUse);
  const textColor = activeBg?.textColor || "text-white";
  const progress =
    amountToRaise > 0 ? Math.min((amountRaised / amountToRaise) * 100, 100) : 0;

  const openLightbox = useCallback(() => {
    tracePaymentAnimation({
      stage: "screen_display_open_requested",
      surface: "screen_display",
      eventId,
      isOpen: false,
    });
    setIsOpen(true);
    tracePaymentAnimation({
      stage: "screen_display_open_committed",
      surface: "screen_display",
      eventId,
      isOpen: true,
    });
    const url = new URL(window.location.href);
    url.searchParams.set("lightbox", "open");
    window.history.pushState({}, "", url.toString());
  }, [eventId]);

  const closeLightbox = useCallback(() => {
    tracePaymentAnimation({
      stage: "screen_display_close_requested",
      surface: "screen_display",
      eventId,
      isOpen: true,
    });
    setIsOpen(false);
    router.replace(window.location.pathname);
  }, [router, eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("lightbox") === "open" || defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        setIsOpen(false);
        router.replace(window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOpen, router]);

  const [animateTip, setAnimateTip] = useState(false);

  useEffect(() => {
    setAnimateTip(true);
    const timer = setTimeout(() => {
      setAnimateTip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [amountRaised]);

  const scanLink = getPublicAbsoluteUrl(
    `/join-host/${eventSlug}?eventCode=${encodeURIComponent(eventCode)}`
  );

  useEffect(() => {
    if (!isOpen) return;
    const el = lightboxVideoRef.current;
    if (!el) return;
    el.src = getLightboxVideoSrc(backgroundToUse);
    void el.play().catch(() => {});
  }, [isOpen, backgroundToUse]);

  const responsiveStyles = useMemo(() => {
    if (isDesktop && isLandscape) {
      return {
        titleSize: "text-6xl lg:text-7xl",
        headingSize: "text-4xl lg:text-5xl",
        paragraphSize: "text-lg",
        qrSize: 120,
        gap: "gap-6",
        padding: "p-8",
        progressBarHeight: "h-10",
        funnelSize: "size-24",
        progressWidth: "max-w-2xl",
      };
    }

    if (isMobile && isLandscape) {
      return {
        titleSize: "text-3xl sm:text-4xl",
        headingSize: "text-xl sm:text-2xl",
        paragraphSize: "text-xs sm:text-sm",
        qrSize: 70,
        gap: "gap-2",
        padding: "p-3",
        progressBarHeight: "h-5",
        funnelSize: "size-14",
        progressWidth: "max-w-lg",
      };
    }

    if (isMobile && !isLandscape) {
      return {
        titleSize: "text-4xl",
        headingSize: "text-2xl sm:text-3xl",
        paragraphSize: "text-xs sm:text-sm",
        qrSize: 90,
        gap: "gap-3",
        padding: "p-4",
        progressBarHeight: "h-5 sm:h-10",
        funnelSize: "size-16",
        progressWidth: "max-w-lg",
      };
    }

    return {
      titleSize: "text-5xl lg:text-6xl",
      headingSize: "text-3xl lg:text-4xl",
      paragraphSize: "text-base lg:text-lg",
      qrSize: 110,
      gap: "gap-8",
      padding: "p-6 lg:p-8",
      progressBarHeight: "h-4 lg:h-10",
      funnelSize: "size-20 lg:size-24",
      progressWidth: "max-w-xl lg:max-w-2xl",
    };
  }, [isLandscape, isMobile, isDesktop]);

  const [showPinnedPerformers, setShowPinnedPerformers] = useState(false);

  return (
    <>
      <div
        onClick={openLightbox}
        className="cursor-pointer"
      >
        {children}
      </div>

      {isOpen && (
        <div
          id="payment-animation-root"
          className={`${OVERLAY_Z_INDEX} fixed inset-0 flex items-center justify-center`}
        >
          <div className="absolute top-4 right-4 z-50">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs`}
            ></div>
            {!isWakeLockSupported && (
              <div className="mt-1 rounded bg-orange-500 px-2 py-1 text-xs text-white">
                Using fallback methods
              </div>
            )}
          </div>

          <div
            className={`relative z-20 flex h-[100vh] w-[100vw] flex-col items-center justify-center overflow-hidden ${responsiveStyles.padding} ${responsiveStyles.gap}`}
          >
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
              showRaisedAmount={showRaisedAmount}
              textColor={textColor}
              progress={progress}
              animateTip={animateTip}
              tipUsageDisclosure={tipUsageDisclosure}
              contributionType={contributionType}
              pinnedDisplayItems={pinnedDisplayItems}
              showPinnedOnScreen={showPinnedOnScreen}
              funnelPosition={funnelPosition}
              scanLink={scanLink}
              onClose={closeLightbox}
              isMobile={isMobile}
              isLandscape={isLandscape}
              responsiveStyles={responsiveStyles}
              showPinnedPerformers={showPinnedPerformers}
              onTogglePinnedPerformers={() =>
                setShowPinnedPerformers(prev => !prev)
              }
              showViewCountOnVideos={showViewCountOnVideos}
              viewCount={viewCount}
            />
          </div>
        </div>
      )}
    </>
  );
};
