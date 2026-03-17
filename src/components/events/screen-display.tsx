/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Third-party imports
import { ArrowLeft } from "lucide-react";
import QRCode from "react-qr-code";

// Local imports
import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";
import { pusherClient } from "@/lib/pusher";
import { confettiStyle } from "@/animation-styles/confetti";
import { SCREEN_BACKGROUNDS } from "@/lib/backgrounds";
import { popAndShootStyle } from "@/animation-styles/pop-and-shoot";
import { burstStyle } from "@/animation-styles/burst";
import { fallStyle } from "@/animation-styles/fall";
import { screenShakeStyle } from "@/animation-styles/screen-shake";
import { luxuriousStyle } from "@/lib/luxuriousStyle";
import { formatWithCommas, toSentenceCase } from "@/lib/utils";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import { floatStyle } from "@/animation-styles/float";
import { RoomCharacter } from "@/types";
import { wrapPaymentAnimation } from "@/lib/wrapPaymentAnimation";
import { getEventId } from "@/lib/identity";
import { spinStyle } from "@/animation-styles/spin";
import { ANIMATION_DURATION } from "@/lib/animationContract";
import {
  getLastPaymentId,
  RoomMessages,
  setLastPaymentId,
} from "./room-messages";
import { playDisplayPaymentAnimation } from "@/lib/DisplayPaymentController";
import { createFactoryFromStyle } from "@/lib/factory-to-style";

interface Props {
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
  tipUsageDisclosure?: any;
  tippingCharacters?: any[];
  children: React.ReactNode;
}

type NewTipEvent = {
  selectedTips: string[];
  id: string;
  eventId: string;
  createdAt: number;
};

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
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isWakeLockSupported, setIsWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const backgroundUrl = backgroundUrlProp ?? "/default.png";
  const showLatest = showLatestAmount ?? false;
  const shouldShowProgressAmounts = !hideProgressBarAmount;

  // NEW: Detect landscape orientation and screen size
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect screen orientation and device type changes
  useEffect(() => {
    const checkScreen = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscapeMode = width > height;
      setIsLandscape(isLandscapeMode);

      // Check if mobile (touch device and small screen)
      const isMobileDevice =
        width <= 768 || ("ontouchstart" in window && width <= 1024);
      setIsMobile(isMobileDevice);

      // Check if desktop (larger screen)
      const isDesktopDevice = width >= 1024;
      setIsDesktop(isDesktopDevice);
    };

    // Initial check
    checkScreen();

    // Listen for resize and orientation changes
    window.addEventListener("resize", checkScreen);
    window.addEventListener("orientationchange", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
      window.removeEventListener("orientationchange", checkScreen);
    };
  }, []);

  const DEFAULT_BG = "/default.png";
  const backgroundToUse = backgroundUrl || DEFAULT_BG;
  const activeBg = SCREEN_BACKGROUNDS.find(bg => bg.url === backgroundToUse);
  const textColor = activeBg?.textColor || "text-white";
  const progress = Math.min((amountRaised / amountToRaise) * 100, 100);

  // Enhanced Wake Lock detection
  const checkWakeLockSupport = () => {
    const isSupported = "wakeLock" in navigator;
    setIsWakeLockSupported(isSupported);

    // Additional check for Puffin and other browsers
    const userAgent = navigator.userAgent.toLowerCase();
    const isPuffin = userAgent.includes("puffin");

    if (isPuffin) {
      // console.log(
      //   "Puffin browser detected - Wake Lock may have limited support"
      // );
    }

    return isSupported;
  };

  const openLightbox = async () => {
    setIsOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set("lightbox", "open");
    window.history.pushState({}, "", url.toString());

    // Activate multiple prevention methods
    await activateWakeLock();
    startActivitySimulation();
  };

  const closeLightbox = () => {
    setIsOpen(false);
    releaseWakeLock();
    stopActivitySimulation();
    router.replace(window.location.pathname);
  };

  const activateWakeLock = async () => {
    try {
      if (!checkWakeLockSupport()) {
        console.warn("Wake Lock API not supported in this browser");
        return;
      }

      // Additional check for Puffin browser compatibility
      const userAgent = navigator.userAgent.toLowerCase();
      const isPuffin = userAgent.includes("puffin");

      if (isPuffin) {
        // console.log("Using enhanced Wake Lock for Puffin browser");
      }

      const wakeLock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wakeLock;
      setWakeLock(wakeLock);
      setWakeLockActive(true);

      // Enhanced event listeners for better compatibility
      wakeLock.addEventListener("release", () => {
        setWakeLock(null);
        setWakeLockActive(false);
        wakeLockRef.current = null;
      });
    } catch (err) {
      console.error("Failed to activate Wake Lock:", err);
      setIsWakeLockSupported(false);
      setWakeLockActive(false);

      // Fallback: Try alternative methods
      startActivitySimulation();
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current
        .release()
        .then(() => {
          setWakeLock(null);
          setWakeLockActive(false);
          wakeLockRef.current = null;
        })
        .catch(err => {
          console.error("Error releasing Wake Lock:", err);
        });
    }
  };

  // Alternative method: Simulate user activity for browsers without Wake Lock support
  const startActivitySimulation = () => {
    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
    }

    // Simulate user activity every 10 seconds to prevent screen timeout
    activityIntervalRef.current = setInterval(() => {
      if (isOpen) {
        // Create a tiny, invisible event to simulate activity
        const event = new Event("visibilitychange");
        document.dispatchEvent(event);

        // Trigger a resize event (commonly used to prevent timeout)
        window.dispatchEvent(new Event("resize"));
      }
    }, 10000); // Every 10 seconds
  };

  const stopActivitySimulation = () => {
    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
      activityIntervalRef.current = null;
    }
  };

  // Enhanced video setup with multiple formats for better compatibility
  const setupVideo = () => {
    // Clean up existing video
    if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.parentNode) {
        videoRef.current.parentNode.removeChild(videoRef.current);
      }
    }

    const video = document.createElement("video");

    // Try multiple video sources for better browser compatibility
    const videoSources = ["/assets/silent-video.mp4"];

    video.src = videoSources?.[0]; // Start with MP4
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("webkit-playsinline", "true"); // iOS compatibility
    video.setAttribute("playsinline", "true");

    // Make video completely invisible but functional
    video.style.position = "fixed";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "2px";
    video.style.height = "2px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.zIndex = "-9999";

    // Handle video errors by trying next format
    video.onerror = () => {
      if (videoSources.length > 1) {
        video.src = videoSources[1];
      }
    };

    video.play().catch(err => {});

    videoRef.current = video;
    document.body.appendChild(video);
  };

  // Setup video and check support when component mounts
  useEffect(() => {
    checkWakeLockSupport();
    setupVideo();

    return () => {
      // Cleanup video
      if (videoRef.current) {
        videoRef.current.pause();
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
      }
      // Cleanup wake lock
      releaseWakeLock();
      // Cleanup activity simulation
      stopActivitySimulation();
    };
  }, []);

  // Enhanced visibility change handler with retry logic
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isOpen && !wakeLockActive) {
        // Wait a moment before retrying to ensure page is fully visible
        setTimeout(async () => {
          try {
            await activateWakeLock();
          } catch (err) {
            console.error(
              "Failed to reacquire Wake Lock on visibility change:",
              err
            );
          }
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, wakeLockActive]);

  // Reinitialize when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setupVideo();
      // Retry wake lock if not active
      if (!wakeLockActive) {
        setTimeout(activateWakeLock, 500);
      }
    } else {
      releaseWakeLock();
      stopActivitySimulation();
    }
  }, [isOpen, activateWakeLock]);

  // If user hits browser back with search param, close the lightbox
  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        setIsOpen(false);
        releaseWakeLock();
        stopActivitySimulation();
        router.replace(window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isOpen, router]);

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

  /**
   * 🚨 SCREEN DISPLAY ANIMATION RULES
   *
   * - Uses paymentController ONLY
   * - Never imports previewController
   * - Never reads localStorage (tipperId)
   * - Animations mount to document.body
   * - Wrappers are origin-only
   */

  // Consolidated Pusher subscriptions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const channel = pusherClient.subscribe(`private-event-${eventId}`);

    const eventQueues = new Map<string, Promise<void>>();

    /**
     * Start payment animations sequentially for an event
     */
    function startPaymentAnimations(
      eventId: string,
      animations: (() => Promise<void>)[]
    ) {
      const previous = eventQueues.get(eventId) ?? Promise.resolve();

      const next = previous.then(async () => {
        for (const run of animations) {
          try {
            await run();
          } catch {
            // Never block the queue on animation failure
          }
        }
      });

      eventQueues.set(eventId, next);
    }

    const handleNewTip = (data: NewTipEvent) => {
      console.log("NEW TIP PAYLOAD", data);

      // Resolve characters in order received
      const selectedCharacters = data.selectedTips
        .map(name => tippingCharacters?.find(c => c.name === name))
        .filter(Boolean) as RoomCharacter[];

      if (!selectedCharacters.length) return;

      const paymentAnimations: (() => Promise<void>)[] = [];
      const seenStyles = new Set<string>(); // ✅ Deduplication per style

      for (const character of selectedCharacters) {
        // Skip if we've already queued this style for this tip
        if (seenStyles.has(character.styleName)) continue;
        seenStyles.add(character.styleName);

        switch (character.styleName) {
          case "Confetti":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                confettiStyle({ tips: [character.name], mode: "payment" })
              )
            );
            break;

          case "Pop and Shoot":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                popAndShootStyle({
                  icons: [character.iconUrl],
                  mode: "payment",
                })
              )
            );
            break;

          case "Burst":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                burstStyle({
                  icons: [character.iconUrl],
                  spread: 300,
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Float":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                floatStyle({
                  icons: [character.iconUrl],
                  mode: "payment",
                  duration: ANIMATION_DURATION.payment.default,
                })
              )
            );
            break;

          case "Screen Shake":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                screenShakeStyle({
                  icons: [character.iconUrl],
                  target: document.body,
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Luxurious":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                luxuriousStyle({
                  videos: ["/icons/crown.webm"],
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Fall":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                fallStyle({
                  icons: [character.iconUrl],
                  fallCount: 60,
                  duration: ANIMATION_DURATION.payment.default,
                  mode: "payment",
                })
              )
            );
            break;

          case "Spin":
            paymentAnimations.push(
              wrapPaymentAnimation(() =>
                spinStyle({ icons: [character.iconUrl], mode: "payment" })
              )
            );
            break;

          default:
            console.warn(`Unknown style: ${character.styleName}`);
        }
      }

      // 🔒 Strict FIFO execution (event-scoped)
      startPaymentAnimations(eventId, paymentAnimations);
    };

    // Bind events
    channel.bind("tip-animation", handleNewTip);

    return () => {
      channel.unbind("tip-animation", handleNewTip);
      pusherClient.unsubscribe(`event-${eventId}`);
    };
  }, [eventId, tippingCharacters]);

  const [, setIsSpinning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpinning(prev => !prev);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const [animateTip, setAnimateTip] = useState(false);

  // Trigger animation when amountRaised changes
  useEffect(() => {
    setAnimateTip(true);
    const timer = setTimeout(() => {
      setAnimateTip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [amountRaised]);

  const scanLink = `${process.env.NEXT_PUBLIC_FRONTEND_APP_URL}/join-host/${eventSlug}?eventCode=${eventCode}`;

  const getVideoSrc = (bg: string) => {
    switch (bg) {
      case "/gaming.png":
        return "/gaming.mp4";
      case "/islamic.png":
        return "/islamic.mp4";
      default:
        return "/default.mp4";
    }
  };

  useEffect(() => {
    if (videoRef.current && backgroundUrl) {
      const videoSrc = getVideoSrc(backgroundUrl);
      videoRef.current.src = videoSrc;
      videoRef.current.load();
      videoRef.current.play().catch(console.error);
    }
  }, [backgroundUrl]);

  // Enhanced responsive styles based on orientation and device type
  const getResponsiveStyles = () => {
    // Desktop landscape (larger screens in landscape)
    if (isDesktop && isLandscape) {
      return {
        titleSize: "text-6xl lg:text-7xl", // Increased for desktop landscape
        headingSize: "text-4xl lg:text-5xl", // Increased for desktop landscape
        paragraphSize: "text-lg",
        qrSize: 120, // Larger QR on desktop
        gap: "gap-6", // Moderate spacing
        padding: "p-8",
        progressBarHeight: "h-10", // Taller progress bar
        funnelSize: "size-24", // Larger funnel
        progressWidth: "max-w-2xl", // Wider progress bar
        spacingMultiplier: 1.2, // Scale factor for desktop
      };
    }

    // Mobile landscape
    if (isMobile && isLandscape) {
      return {
        titleSize: "text-3xl sm:text-4xl",
        headingSize: "text-xl sm:text-2xl",
        paragraphSize: "text-xs sm:text-sm",
        qrSize: 70, // Smaller QR on mobile landscape
        gap: "gap-2", // Very tight spacing for mobile landscape
        padding: "p-3",
        progressBarHeight: "h-5",
        funnelSize: "size-14",
        progressWidth: "max-w-lg",
        spacingMultiplier: 0.8, // Scale factor for mobile
      };
    }

    // Mobile portrait
    if (isMobile && !isLandscape) {
      return {
        titleSize: "text-4xl",
        headingSize: "text-2xl sm:text-3xl",
        paragraphSize: "text-xs sm:text-sm",
        qrSize: 90,
        gap: "gap-3", // Tighter gap for mobile portrait
        padding: "p-4",
        progressBarHeight: "h-5 sm:h-10",
        funnelSize: "size-16",
        progressWidth: "max-w-lg",
        spacingMultiplier: 0.9, // Slightly tighter
      };
    }

    // Default (desktop portrait or fallback)
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
      spacingMultiplier: 1.0,
    };
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <>
      {/* Trigger */}
      <div
        onClick={openLightbox}
        className="cursor-pointer"
      >
        {children}
      </div>

      {/* Lightbox */}
      {isOpen && (
        <div
          id="payment-animation-root"
          className="fixed inset-0 z-[999999999] flex items-center justify-center"
        >
          {/* Wake Lock Status Indicator */}
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

          {/* Main Container - Responsive based on orientation and device */}
          <div
            className={`relative z-20 flex h-[100vh] w-[100vw] flex-col items-center justify-center overflow-hidden ${responsiveStyles.padding} ${responsiveStyles.gap}`}
          >
            <video
              ref={lightboxVideoRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-0 left-0 z-[-1] h-full w-full object-cover"
              src={getVideoSrc(backgroundUrl)}
              key={backgroundUrl}
            />

            <button
              onClick={closeLightbox}
              className={`absolute ${isMobile ? "top-2 left-2" : "top-4 left-4"} flex cursor-pointer items-center gap-2 rounded-full`}
            >
              <ArrowLeft
                className={`${isMobile ? "size-4" : "size-5 sm:size-6"} ${textColor}`}
              />
            </button>

            {/* Heading - Larger on desktop landscape */}
            <h2
              className={`text-center ${responsiveStyles.headingSize} font-semibold ${textColor}`}
            >
              {showLatest ? "Latest amount sent" : "Together you've sent"}
            </h2>

            {/* Amount - Larger on desktop landscape */}
            <Title
              size="lg"
              className={`${isMobile ? (isLandscape ? "-mt-1" : "-mt-2") : isLandscape ? "-mt-4" : "-mt-6"} ${responsiveStyles.titleSize} ${textColor}`}
            >
              &pound;
              {showLatest
                ? formatWithCommas(latestTipAmount ?? 0)
                : formatWithCommas(amountRaised)}
            </Title>

            <div>
              <Paragraph
                align="center"
                weight="bold"
                className={textColor}
              >
                <div
                  style={{
                    width: "200px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      paddingLeft: "100%",
                      animation: "scroll-left 12s linear infinite",
                    }}
                  >
                    For{" "}
                    {Array.isArray(tipUsageDisclosure) &&
                      tipUsageDisclosure.length > 0 &&
                      tipUsageDisclosure.map(
                        (item: TipUsageDisclosure, index: number) => (
                          <span key={item.id}>
                            {toSentenceCase(item.customLabel || item.usageType)}
                            {index < tipUsageDisclosure.length - 1 ? ", " : ""}
                          </span>
                        )
                      )}
                  </div>
                </div>

                <style>
                  {`
      @keyframes scroll-left {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(-100%);
        }
      }
    `}
                </style>
              </Paragraph>
            </div>

            {/* Animation Container */}
            <div
              className="popup-container"
              id="popup-container"
            ></div>

            {/* Progress Bar Section - Responsive */}
            <div
              className={`flex w-full ${responsiveStyles.progressWidth} items-center gap-3`}
            >
              {/* Progress Bar */}
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

                {!shouldShowProgressAmounts && (
                  <Paragraph
                    weight="bold"
                    className={`${textColor} ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}
                  >
                    &pound;{formatWithCommas(amountRaised)}
                  </Paragraph>
                )}
              </div>

              {/* Target Icon */}
              <div className="flex flex-col items-center">
                {/* <Gem
                  className={`text-primary fill-primary mr-8 ${isMobile ? (isLandscape ? "size-8" : "size-8") : "size-5 sm:size-10"}`}
                /> */}

                <Image
                  src="/icons/diamond.png"
                  alt="Diamond"
                  width={40}
                  height={40}
                  className="-mt-1 size-5 shrink-0 sm:size-10"
                />

                {!shouldShowProgressAmounts && (
                  <Paragraph
                    weight="bold"
                    className={`${textColor} ${isMobile ? "text-xs" : "text-sm sm:text-base"}`}
                  >
                    &pound;{formatWithCommas(amountToRaise)}
                  </Paragraph>
                )}
              </div>
            </div>

            {/* Website URL - Adjusted positioning */}
            <Paragraph
              weight="bold"
              className={`${textColor} ${!shouldShowProgressAmounts ? "-mt-10 sm:-mt-12 lg:-mt-14" : "-mt-4"}`}
            >
              tipmanna.com
            </Paragraph>

            {/* QR Code Section - Responsive */}
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

            {/* Funnel Button - Adjusted size and position */}
            <button
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
