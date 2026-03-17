"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Local imports
import { pusherClient } from "@/lib/pusher";

interface Props {
  eventId: string;
  amountToRaise: number;
  amountRaised: number;
}

export const EventProgressBar = ({
  amountToRaise,
  amountRaised,
  eventId,
}: Props) => {
  const [animateTip, setAnimateTip] = useState(false);

  const safeTarget =
    typeof amountToRaise === "number" && amountToRaise > 0 ? amountToRaise : 1;
  const progress = Math.min((amountRaised / amountToRaise) * 100, 100);

  useEffect(() => {
    if (!amountRaised) return;
    setAnimateTip(true);
    const timer = setTimeout(() => setAnimateTip(false), 800);
    return () => clearTimeout(timer);
  }, [amountRaised]);

  return (
    <div className="flex w-full items-center rounded-md">
      <div className="flex-1">
        <div className="relative h-3 overflow-hidden rounded-md bg-black sm:h-5">
          <div
            className={`from-primary to-secondary absolute top-0 left-0 h-full bg-gradient-to-r transition-all duration-500 ${
              animateTip ? "animate-glow" : ""
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold sm:text-base">
            £{amountRaised}
          </span>
          <span className="-ml-10 text-[12px] font-semibold sm:text-base">
            £{safeTarget}
          </span>
        </div>
      </div>
      <Image
        src="/icons/diamond.png"
        alt="Diamond"
        width={40}
        height={40}
        className="-mt-3 size-5 sm:size-7"
      />
    </div>
  );
};
