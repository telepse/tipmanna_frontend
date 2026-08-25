"use client";

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
  return (
    <div
      className="rounded-2xl border px-2 pt-6 pb-3 shadow-lg sm:px-4 sm:py-6"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <h3 className="open_sans relative text-center text-2xl font-medium sm:text-4xl">
        {isMoney && <>&pound;</>}
        {formatWithCommas(value)}

        {isMoney && (
          <span className="open_sans text-muted-foreground absolute -top-4 right-2 text-[10px] sm:-top-6 sm:text-[12px]">
            {label}
          </span>
        )}
      </h3>

      {!isMoney && (
        <Paragraph
          align="center"
          size="xs"
          color="muted"
          className="-mt-1 sm:text-sm"
        >
          {label}
        </Paragraph>
      )}

      {isMoney && (
        <Paragraph
          align="center"
          color="muted"
          size="xs"
          className="-mt-1 sm:text-sm"
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
