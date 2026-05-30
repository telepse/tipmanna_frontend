"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import QRCode from "react-qr-code";
import { NativeVideo } from "@/components/native-video";

// Third-party imports
import { ArrowLeft, Pin } from "lucide-react";
import { OVERLAY_Z_INDEX } from "@/lib/drawer-z-index";

// Local imports
import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";
import { SCREEN_BACKGROUNDS } from "@/lib/backgrounds";
import { formatWithCommas, toSentenceCase } from "@/lib/utils";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import { RoomCharacter } from "@/types";
import { TipAnimationEvent } from "@/lib/animation-guard";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { useAnimationQueue } from "@/hooks/use-animation-queue";
import { useScreenDetection } from "@/hooks/use-screen-detection";
import { animLog } from "@/lib/animationDebug";
import { enqueuePaymentBundleForValidatedTip } from "@/lib/run-payment-bundle-animations";
import { preloadPaymentAnimationAssetsForCharacters } from "@/lib/preload-payment-animations";
import { getPublicAbsoluteUrl } from "@/lib/site-config";
import { Performer } from "@/types/performer.types";
import { useGlobalTipStream } from "@/hooks/use-global-tip-stream";

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
  children: React.ReactNode;
  /** Open fundraise / screen display lightbox on mount (e.g. /room/:id/screen). */
  defaultOpen?: boolean;
  /** When false, hide amount-raised UI on this surface. */
  showAmountRaisedOnVideos?: boolean;
  /** When true, show view count if provided. */
  showViewCountOnVideos?: boolean;
  viewCount?: number;
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
  defaultOpen = false,
  showAmountRaisedOnVideos = true,
  showViewCountOnVideos = false,
  viewCount,
}: ScreenDisplayProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();

  const backgroundUrl = backgroundUrlProp ?? "/default.png";
  const showLatest = showLatestAmount ?? false;
  const shouldShowProgressAmounts = !hideProgressBarAmount;
  const showRaisedAmount = showAmountRaisedOnVideos !== false;

  const { isLandscape, isMobile, isDesktop } = useScreenDetection();
  const { isSupported: isWakeLockSupported } = useWakeLock({ enabled: isOpen });
  const { enqueue } = useAnimationQueue({ eventId, enabled: isOpen });

  useGlobalTipStream({ eventId, enabled: isOpen, surface: "screen_display" });

  const characterMap = useMemo(() => {
    const map = new Map<string, RoomCharacter>();
    if (tippingCharacters) {
      for (const c of tippingCharacters) {
        map.set(c.name, c);
      }
    }
    return map;
  }, [tippingCharacters]);

  const characterMapRef = useRef(characterMap);
  characterMapRef.current = characterMap;

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
    setIsOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("lightbox", "open");
    window.history.pushState({}, "", url.toString());
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    router.replace(window.location.pathname);
  }, [router]);

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

  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;

    const handleValidatedTip = (e: Event) => {
      const data = (e as CustomEvent<TipAnimationEvent>).detail;
      animLog("NEW TIP PAYLOAD", data);

      const dedupeKeyBase = data.id ?? `${data.eventId}-${data.serverTs}`;
      enqueuePaymentBundleForValidatedTip({
        data,
        characterMap: characterMapRef.current,
        buildDedupeKey: name => `screen-${dedupeKeyBase}-${name}`,
        enqueue,
        surface: "screen_display",
      });
    };

    window.addEventListener("validated-tip", handleValidatedTip);
    return () =>
      window.removeEventListener("validated-tip", handleValidatedTip);
  }, [isOpen, enqueue]);

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

  const disclosureItems = Array.isArray(tipUsageDisclosure)
    ? tipUsageDisclosure
    : [];

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

            {performers && performers.length && performers.length > 0 && (
              <div className="absolute top-2 left-1/2 z-20 -translate-x-1/2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPinnedPerformers(prev => !prev)}
                    className="cursor-pointer"
                  >
                    <Pin className={`${textColor}`} />
                  </button>

                  {showPinnedPerformers && (
                    <div className="absolute top-4 left-1/2 flex h-[50px] w-[250px] -translate-x-1/2 items-center justify-between border bg-white/70 p-4 sm:w-[500px]">
                      {performers.map((performer: Performer) => (
                        <div
                          key={performer.id}
                          className="flex gap-2 text-xs"
                        >
                          {performer.name}{" "}
                          <span className="font-medium">
                            &pound;{performer.amountReceived ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={closeLightbox}
              className={`absolute ${isMobile ? "top-2 left-2" : "top-4 left-4"} flex cursor-pointer items-center gap-2 rounded-full`}
            >
              <ArrowLeft
                className={`${isMobile ? "size-4" : "size-5 sm:size-6"} ${textColor}`}
              />
            </button>

            <h2
              className={`text-center ${responsiveStyles.headingSize} font-semibold ${textColor}`}
            >
              {showLatest ? "Latest amount sent" : "Together you've sent"}
            </h2>

            {showRaisedAmount ? (
              <Title
                size="lg"
                className={`${isMobile ? (isLandscape ? "-mt-1" : "-mt-2") : isLandscape ? "-mt-4" : "-mt-6"} ${responsiveStyles.titleSize} ${textColor}`}
              >
                &pound;
                {showLatest
                  ? formatWithCommas(latestTipAmount ?? 0)
                  : formatWithCommas(amountRaised)}
              </Title>
            ) : null}

            {showViewCountOnVideos && typeof viewCount === "number" ? (
              <Paragraph
                align="center"
                weight="bold"
                className={textColor}
              >
                {formatWithCommas(viewCount)} views
              </Paragraph>
            ) : null}

            <div>
              <Paragraph
                align="center"
                weight="bold"
                className={textColor}
              >
                <div className="screen-display-marquee">
                  <div className="screen-display-marquee-track">
                    For{" "}
                    {disclosureItems.length > 0 &&
                      disclosureItems.map((item, index) => (
                        <span key={item.id}>
                          {toSentenceCase(item.customLabel || item.usageType)}
                          {index < disclosureItems.length - 1 ? ", " : ""}
                        </span>
                      ))}
                  </div>
                </div>
              </Paragraph>
            </div>

            <div
              className="popup-container"
              id="popup-container"
            ></div>

            <div
              className={`flex w-full ${responsiveStyles.progressWidth} items-center gap-3`}
            >
              <div className="flex-1">
                <div
                  className={`relative z-50 ${responsiveStyles.progressBarHeight} overflow-hidden rounded-md bg-black`}
                >
                  <div
                    className={`from-primary to-secondary absolute top-0 left-0 h-full bg-gradient-to-r transition-all duration-500 ${
                      animateTip ? "animate-glow" : ""
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {!shouldShowProgressAmounts && showRaisedAmount ? (
                  <Paragraph
                    weight="bold"
                    className={`${textColor} ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}
                  >
                    &pound;{formatWithCommas(amountRaised)}
                  </Paragraph>
                ) : null}
              </div>

              <div className="flex flex-col items-center">
                <Image
                  src="/icons/diamond.png"
                  alt="Diamond"
                  width={40}
                  height={40}
                  className="-mt-1 size-5 shrink-0 sm:size-10"
                />

                {!shouldShowProgressAmounts && showRaisedAmount ? (
                  <Paragraph
                    weight="bold"
                    className={`${textColor} ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}
                  >
                    &pound;{formatWithCommas(amountToRaise)}
                  </Paragraph>
                ) : null}
              </div>
            </div>

            <Paragraph
              weight="bold"
              className={`${textColor} ${!shouldShowProgressAmounts ? "-mt-10 sm:-mt-12 lg:-mt-14" : "-mt-4"}`}
            >
              tipmanna.com
            </Paragraph>

            <div
              className={`flex flex-col items-center justify-center gap-1 ${isMobile ? (isLandscape ? "mt-1" : "mt-4") : "mt-8 sm:mt-12"}`}
            >
              <QRCode
                size={responsiveStyles.qrSize}
                bgColor="white"
                fgColor="black"
                value={scanLink}
              />

              <div
                className={`rounded border border-[#667185] bg-[#212121] px-2 py-1 text-center text-white ${isMobile ? (isLandscape ? "text-xs" : "text-sm") : "text-base"}`}
              >
                {eventName}
              </div>
            </div>

            <button
              type="button"
              id="funnel-btn"
              className={`absolute animate-bounce ${isMobile ? "bottom-2 left-2" : "bottom-4 left-4"}`}
            >
              <Image
                src="/events/funnel.png"
                alt="Funnel"
                width={100}
                height={100}
                className={`${responsiveStyles.funnelSize} object-contain`}
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
