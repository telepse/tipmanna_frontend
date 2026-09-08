"use client";

import type { ReactNode } from "react";

type Props = {
  visits: number;
  tips: number;
  shares: number;
  onTipsClick?: () => void;
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

function TickerLine({ visits, tips, shares, onTipsClick }: Props) {
  return (
    <>
      <TickerSegment>{visits} visits</TickerSegment>
      <span className="shrink-0 text-white/30">·</span>
      <TickerSegment onClick={onTipsClick}>{tips} tips</TickerSegment>
      <span className="shrink-0 text-white/30">·</span>
      <TickerSegment>{shares} shares</TickerSegment>
      <span className="shrink-0 text-white/30">·</span>
      <span className="shrink-0">Watch</span>
      <span className="shrink-0 text-white/30">·</span>
      <span className="shrink-0">Engage</span>
      <span className="shrink-0 text-white/30">·</span>
      <span className="shrink-0">Support</span>
    </>
  );
}

/** Calm right-to-left metrics ribbon for TipLink sticky header. */
export function TipLinkMetricsTicker({
  visits,
  tips,
  shares,
  onTipsClick,
}: Props) {
  const line = (
    <TickerLine
      visits={visits}
      tips={tips}
      shares={shares}
      onTipsClick={onTipsClick}
    />
  );

  return (
    <div
      className="group relative h-8 overflow-hidden border-b border-white/10 bg-black/35 backdrop-blur-md"
      aria-live="polite"
    >
      <div className="tiplink-metrics-ticker-static flex h-full items-center justify-center gap-2 px-4 text-xs text-white/70 md:hidden">
        {line}
      </div>
      <div className="tiplink-metrics-ticker-marquee hidden h-full items-center md:flex">
        <div className="tiplink-metrics-ticker-track flex w-max items-center gap-2 px-4 text-xs text-white/70">
          {line}
          <span className="shrink-0 px-2 text-white/20">|</span>
          {line}
        </div>
      </div>
    </div>
  );
}
