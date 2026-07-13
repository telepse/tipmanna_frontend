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
      className="rounded-2xl border px-6 py-6 shadow-lg sm:py-12"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <h2 className="open_sans text-center text-xl font-medium sm:text-4xl">
        {isMoney && <>&pound;</>}
        {formatWithCommas(value)}
      </h2>
      <Paragraph
        align="center"
        size={isDesktopOrLaptop ? "lg" : "sm"}
        color="muted"
      >
        {label}
      </Paragraph>
      <Paragraph
        align="center"
        size="xs"
        color="muted"
        className="text-[10px]"
      >
        {subtitle}
      </Paragraph>
    </div>
  );
};
