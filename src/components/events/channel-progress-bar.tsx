"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Props {
  /** Reserved for future use (e.g. per-event analytics). */
  eventId?: string;
  amountToRaise?: number | null;
  amountRaised?: number | null;
  showDiamond?: boolean;
}

export const ChannelProgressBar = ({
  amountToRaise,
  amountRaised,
  showDiamond = true,
}: Props) => {
  const [animateTip, setAnimateTip] = useState(false);

  const safeTarget =
    typeof amountToRaise === "number" &&
    amountToRaise > 0 &&
    !Number.isNaN(amountToRaise)
      ? amountToRaise
      : 1;
  const raised =
    typeof amountRaised === "number" && !Number.isNaN(amountRaised)
      ? amountRaised
      : 0;
  const progress = Math.min((raised / safeTarget) * 100, 100);

  useEffect(() => {
    if (!amountRaised) return;
    setAnimateTip(true);
    const timer = setTimeout(() => setAnimateTip(false), 800);
    return () => clearTimeout(timer);
  }, [amountRaised]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="column flex h-[105px] w-[15px] flex-col justify-end overflow-hidden rounded-md bg-white/70 lg:w-[13px]">
        <div
          className={`from-primary to-secondary w-full shrink-0 bg-gradient-to-t transition-all duration-500 ${animateTip ? "animate-glow" : ""}`}
          style={{ height: `${progress}%`, minHeight: progress > 0 ? 2 : 0 }}
        />
      </div>
      {showDiamond ? (
        <Image
          src="/icons/black-diamond.png"
          alt="Black Diamond"
          width={40}
          height={40}
          className="pointer-events-none absolute -bottom-[2px] left-1/2 size-[14px] -translate-x-1/2"
        />
      ) : null}
    </div>
  );
};
