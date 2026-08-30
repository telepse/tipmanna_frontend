"use client";

import { cn } from "@/lib/utils";

export function formatSocialCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n > 999) return "999+";
  return String(Math.floor(n));
}

/** Icon with a compact count label beneath (TV / channel rails). */
export function ChannelSocialIconStack({
  count,
  children,
  countClassName,
}: {
  count: number;
  children: React.ReactNode;
  countClassName?: string;
}) {
  return (
    <span className="flex flex-col items-center gap-0.5 leading-none">
      {children}
      <span
        className={cn(
          "text-[9px] font-semibold tracking-tight text-white tabular-nums drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]",
          countClassName
        )}
      >
        {formatSocialCount(count)}
      </span>
    </span>
  );
}
