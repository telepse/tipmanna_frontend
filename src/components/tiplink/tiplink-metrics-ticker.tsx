"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  visits: number;
  tips: number;
  shares: number;
  sectionCtaLabel?: string;
  docked?: boolean;
  dockedHeight?: number;
  /** Enlarge: hide Watch · CTA · Support label-only segments. */
  hideActionLabels?: boolean;
  useDesktopPipReserve?: boolean;
  pipReserveMobile?: number;
  pipReserveDesktop?: number;
  onTipsClick?: () => void;
  navActions?: ReactNode;
};

function TickerSegment({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-primary hover:text-primary/80 shrink-0 transition-colors"
      >
        {children}
      </button>
    );
  }
  return <span className="text-primary shrink-0">{children}</span>;
}

function TickerLabel({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 text-[11px] tracking-wide text-white/50 uppercase">
      {children}
    </span>
  );
}

function TickerLine({
  visits,
  tips,
  shares,
  sectionCtaLabel,
  hideActionLabels = false,
  onTipsClick,
  navActions,
}: Omit<
  Props,
  | "docked"
  | "dockedHeight"
  | "useDesktopPipReserve"
  | "pipReserveMobile"
  | "pipReserveDesktop"
>) {
  const engageLabel = sectionCtaLabel?.trim() || "Engage";
  return (
    <>
      <TickerSegment>{visits} visits</TickerSegment>
      <span className="shrink-0 text-white/30">·</span>
      <TickerSegment onClick={onTipsClick}>{tips} tips</TickerSegment>
      <span className="shrink-0 text-white/30">·</span>
      <TickerSegment>{shares} shares</TickerSegment>
      {!hideActionLabels ? (
        <>
          <span className="shrink-0 text-white/30">·</span>
          <TickerLabel>Watch</TickerLabel>
          <span className="shrink-0 text-white/30">·</span>
          <TickerLabel>{engageLabel}</TickerLabel>
          <span className="shrink-0 text-white/30">·</span>
          <TickerLabel>Support</TickerLabel>
        </>
      ) : null}
      {navActions ? (
        <>
          <span className="shrink-0 text-white/30">·</span>
          {navActions}
        </>
      ) : null}
    </>
  );
}

/** Calm right-to-left metrics ribbon for TipLink sticky header. */
export function TipLinkMetricsTicker({
  visits,
  tips,
  shares,
  sectionCtaLabel,
  docked = false,
  dockedHeight,
  hideActionLabels = false,
  useDesktopPipReserve = false,
  pipReserveMobile = 108,
  pipReserveDesktop = 140,
  onTipsClick,
  navActions,
}: Props) {
  const line = (
    <TickerLine
      visits={visits}
      tips={tips}
      shares={shares}
      sectionCtaLabel={sectionCtaLabel}
      hideActionLabels={hideActionLabels}
      onTipsClick={onTipsClick}
      navActions={navActions}
    />
  );

  return (
    <div
      className={cn(
        "group relative overflow-hidden border-b border-white/10",
        docked ? "flex min-h-0 items-center" : "h-8"
      )}
      aria-live="polite"
      style={
        docked
          ? ({
              minHeight: dockedHeight,
              "--tiplink-pip-pr-mobile": `${pipReserveMobile}px`,
              "--tiplink-pip-pr-desktop": `${pipReserveDesktop}px`,
            } as CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          "tiplink-metrics-ticker-marquee flex h-full min-h-8 w-full items-center",
          docked &&
            (useDesktopPipReserve
              ? "tiplink-metrics-ticker-docked-desktop"
              : "tiplink-metrics-ticker-docked-mobile")
        )}
      >
        <div className="tiplink-metrics-ticker-track flex items-center gap-2 px-4 text-xs whitespace-nowrap text-white/70">
          {line}
          <span className="shrink-0 px-2 text-white/20">|</span>
          {line}
          <span className="shrink-0 px-2 text-white/20">|</span>
          {line}
          <span className="shrink-0 px-2 text-white/20">|</span>
          {line}
        </div>
      </div>
      <div className="tiplink-metrics-ticker-static pointer-events-none absolute inset-0 hidden items-center justify-center gap-2 px-4 text-xs whitespace-nowrap text-white/70">
        {line}
      </div>
    </div>
  );
}
