"use client";

import Image from "next/image";
import QRCode from "react-qr-code";
import { ArrowLeft, Pin } from "lucide-react";

import { Title } from "@/components/shared/title";
import { Paragraph } from "@/components/shared/paragraph";
import { formatWithCommas, toSentenceCase } from "@/lib/utils";
import { TipUsageDisclosure } from "@/types/tipusagedisclosure.types";
import {
  funnelCornerClassName,
  type ScreenFunnelPosition,
} from "@/lib/screen-funnel-position";

export type ScreenDisplayHudVariant = "opaque" | "overlay";

export type ScreenDisplayPinnedItem = {
  id?: string;
  name: string;
  amountReceived?: string | number;
};

export interface ScreenDisplayHudProps {
  variant: ScreenDisplayHudVariant;
  amountToRaise: number;
  amountRaised: number;
  eventName: string;
  showLatest: boolean;
  latestTipAmount?: number;
  shouldShowProgressAmounts: boolean;
  showRaisedAmount: boolean;
  textColor: string;
  progress: number;
  animateTip: boolean;
  tipUsageDisclosure?: TipUsageDisclosure[];
  contributionType?: string;
  pinnedDisplayItems: ScreenDisplayPinnedItem[];
  showPinnedOnScreen: boolean;
  funnelPosition: ScreenFunnelPosition;
  scanLink?: string;
  /** Opaque lightbox only */
  onClose?: () => void;
  isMobile?: boolean;
  isLandscape?: boolean;
  responsiveStyles: {
    titleSize: string;
    headingSize: string;
    qrSize: number;
    gap: string;
    padding: string;
    progressBarHeight: string;
    funnelSize: string;
    progressWidth: string;
  };
  showPinnedPerformers?: boolean;
  onTogglePinnedPerformers?: () => void;
  showViewCountOnVideos?: boolean;
  viewCount?: number;
}

export function ScreenDisplayHud({
  variant,
  amountToRaise,
  amountRaised,
  eventName,
  showLatest,
  latestTipAmount,
  shouldShowProgressAmounts,
  showRaisedAmount,
  textColor,
  progress,
  animateTip,
  tipUsageDisclosure,
  contributionType = "PERFORMER",
  pinnedDisplayItems,
  showPinnedOnScreen,
  funnelPosition,
  scanLink,
  onClose,
  isMobile = false,
  isLandscape = false,
  responsiveStyles,
  showPinnedPerformers = false,
  onTogglePinnedPerformers,
  showViewCountOnVideos = false,
  viewCount,
}: ScreenDisplayHudProps) {
  const disclosureItems = Array.isArray(tipUsageDisclosure)
    ? tipUsageDisclosure
    : [];

  const overlayText =
    variant === "overlay"
      ? `${textColor} drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]`
      : textColor;

  const funnelSizeClass =
    variant === "overlay"
      ? "h-[10vmin] w-[10vmin] object-contain"
      : `${responsiveStyles.funnelSize} object-contain`;

  const pinExpanded =
    variant === "overlay"
      ? showPinnedOnScreen && pinnedDisplayItems.length > 0
      : showPinnedPerformers;

  const titleSize =
    variant === "overlay"
      ? "text-[6vmin] font-semibold"
      : responsiveStyles.titleSize;
  const headingSize =
    variant === "overlay"
      ? "text-[3.5vmin] font-semibold"
      : responsiveStyles.headingSize;
  const progressWidth =
    variant === "overlay"
      ? "w-[80vw] max-w-3xl"
      : responsiveStyles.progressWidth;
  const progressBarHeight =
    variant === "overlay" ? "h-[2.5vmin]" : responsiveStyles.progressBarHeight;

  const showPinHud = pinnedDisplayItems.length > 0 && showPinnedOnScreen;

  return (
    <>
      {showPinHud && (
        <div
          className={
            variant === "overlay"
              ? "absolute top-[2vmin] left-1/2 z-20 -translate-x-1/2"
              : "absolute top-2 left-1/2 z-20 -translate-x-1/2"
          }
        >
          <div className="relative">
            {variant === "opaque" && onTogglePinnedPerformers ? (
              <button
                type="button"
                onClick={onTogglePinnedPerformers}
                className="cursor-pointer"
              >
                <Pin className={textColor} />
              </button>
            ) : variant === "overlay" && showPinnedOnScreen ? (
              <Pin className={`${overlayText} mx-auto block`} />
            ) : null}

            {pinExpanded && (
              <div
                className={
                  variant === "overlay"
                    ? "absolute top-[4vmin] left-1/2 flex min-h-[50px] w-[min(80vw,500px)] -translate-x-1/2 flex-col justify-center gap-1 rounded border border-white/30 bg-black/50 p-[2vmin] text-[2vmin]"
                    : "absolute top-4 left-1/2 flex min-h-[50px] w-[250px] -translate-x-1/2 flex-col justify-center gap-1 border bg-white/70 p-4 sm:w-[500px]"
                }
              >
                {pinnedDisplayItems.map(item => (
                  <div
                    key={item.id ?? item.name}
                    className={`flex gap-2 ${variant === "overlay" ? "text-white" : "text-xs"}`}
                  >
                    <span
                      className={
                        variant === "overlay"
                          ? "text-white/70"
                          : "text-black/60"
                      }
                    >
                      {contributionType === "PROJECT"
                        ? "project:"
                        : "performer:"}
                    </span>
                    {item.name}{" "}
                    <span className="font-medium">
                      &pound;{item.amountReceived ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {variant === "opaque" && onClose ? (
        <button
          type="button"
          onClick={onClose}
          className={`absolute ${isMobile ? "top-2 left-2" : "top-4 left-4"} flex cursor-pointer items-center gap-2 rounded-full`}
        >
          <ArrowLeft
            className={`${isMobile ? "size-4" : "size-5 sm:size-6"} ${textColor}`}
          />
        </button>
      ) : null}

      <h2 className={`text-center ${headingSize} ${overlayText}`}>
        {showLatest ? "Latest amount sent" : "Together you've sent"}
      </h2>

      {showRaisedAmount ? (
        <Title
          size="lg"
          className={`${variant === "overlay" ? "" : isMobile ? (isLandscape ? "-mt-1" : "-mt-2") : isLandscape ? "-mt-4" : "-mt-6"} ${titleSize} ${overlayText}`}
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
          className={overlayText}
        >
          {formatWithCommas(viewCount)} views
        </Paragraph>
      ) : null}

      {variant === "overlay" ? (
        <Paragraph
          align="center"
          weight="bold"
          className={`${overlayText} text-[2.5vmin]`}
        >
          {eventName}
        </Paragraph>
      ) : null}

      <div>
        <Paragraph
          align="center"
          weight="bold"
          className={overlayText}
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
      />

      <div className={`flex w-full ${progressWidth} items-center gap-3`}>
        <div className="flex-1">
          <div
            className={`relative z-50 ${progressBarHeight} overflow-hidden rounded-md bg-black`}
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
              className={`${overlayText} ${variant === "overlay" ? "text-[2vmin]" : isMobile ? "text-xs" : "text-sm sm:text-base"}`}
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
            className={
              variant === "overlay"
                ? "-mt-1 h-[4vmin] w-[4vmin] shrink-0"
                : "-mt-1 size-5 shrink-0 sm:size-10"
            }
          />

          {!shouldShowProgressAmounts && showRaisedAmount ? (
            <Paragraph
              weight="bold"
              className={`${overlayText} ${variant === "overlay" ? "text-[2vmin]" : isMobile ? "text-xs" : "text-sm sm:text-base"}`}
            >
              &pound;{formatWithCommas(amountToRaise)}
            </Paragraph>
          ) : null}
        </div>
      </div>

      {variant === "opaque" ? (
        <>
          <Paragraph
            weight="bold"
            className={`${textColor} ${!shouldShowProgressAmounts ? "-mt-10 sm:-mt-12 lg:-mt-14" : "-mt-4"}`}
          >
            tipmanna.com
          </Paragraph>

          <div
            className={`flex flex-col items-center justify-center gap-1 ${isMobile ? (isLandscape ? "mt-1" : "mt-4") : "mt-8 sm:mt-12"}`}
          >
            {scanLink ? (
              <QRCode
                size={responsiveStyles.qrSize}
                bgColor="white"
                fgColor="black"
                value={scanLink}
              />
            ) : null}

            <div
              className={`rounded border border-[#667185] bg-[#212121] px-2 py-1 text-center text-white ${isMobile ? (isLandscape ? "text-xs" : "text-sm") : "text-base"}`}
            >
              {eventName}
            </div>
          </div>
        </>
      ) : null}

      <button
        type="button"
        id="funnel-btn"
        className={`${funnelCornerClassName(funnelPosition, variant, isMobile)} z-30 animate-bounce`}
        aria-hidden
        tabIndex={-1}
      >
        <Image
          src="/events/funnel.png"
          alt="Funnel"
          width={100}
          height={100}
          className={funnelSizeClass}
        />
      </button>
    </>
  );
}
