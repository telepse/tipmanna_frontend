"use client";

import { useMediaQuery } from "react-responsive";

// Local imports
import { Paragraph } from "../shared/paragraph";
import { formatWithCommas } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  isMoney?: boolean;
}

export const StatCard = ({
  label,
  value,
  subtitle,
  isMoney,
}: StatCardProps) => {
  const isDesktopOrLaptop = useMediaQuery({
    query: "(min-width: 1224px)",
  });

  return (
    <div
      className="rounded-2xl border px-2 pt-6 pb-3 shadow-lg sm:px-4 sm:py-6"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <h2
        className={`open_sans relative text-center text-xl font-medium sm:text-4xl`}
      >
        {isMoney && <>&pound;</>}
        {formatWithCommas(value)}

        {isMoney && (
          <Paragraph
            align="center"
            color="muted"
            className="absolute -top-4 right-2 text-[10px] sm:-top-6 sm:text-[12px]"
          >
            {label}
          </Paragraph>
        )}
      </h2>

      {!isMoney && (
        <Paragraph
          align="center"
          size={isDesktopOrLaptop ? "sm" : "xs"}
          color="muted"
          className="-mt-1"
        >
          {label}
        </Paragraph>
      )}

      {isMoney && (
        <Paragraph
          align="center"
          color="muted"
          size={isDesktopOrLaptop ? "sm" : "xs"}
          className="-mt-1"
        >
          Supporter Participation
        </Paragraph>
      )}
      <div className="mt-4 flex w-full justify-center">
        {subtitle ? (
          <Paragraph
            align="center"
            size="xs"
            className="bg-secondary w-fit rounded-full px-2 py-1 text-[10px] text-black"
          >
            {isMoney && <>&pound;</>}
            {subtitle}
          </Paragraph>
        ) : null}
      </div>
    </div>
  );
};
