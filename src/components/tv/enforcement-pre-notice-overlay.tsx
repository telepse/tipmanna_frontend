"use client";

import { cn } from "@/lib/utils";

function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  title: string;
  remainingSec: number;
  onReturnToLocal?: () => void;
  className?: string;
};

export function EnforcementPreNoticeOverlay({
  title,
  remainingSec,
  onReturnToLocal,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-[35] flex flex-col items-center justify-center gap-4 bg-black/95 px-6 text-center",
        className
      )}
    >
      <p className="text-lg font-semibold text-white md:text-2xl">{title}</p>
      <p className="text-base font-medium text-white tabular-nums">
        Program starts on Live TV in {formatCountdown(remainingSec)}
      </p>
      <p className="text-sm text-white/80">
        No action needed — playback continues on Live TV when the countdown
        finishes.
      </p>
      {onReturnToLocal ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onReturnToLocal();
          }}
          className="mt-2 rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          Return to what I was watching
        </button>
      ) : null}
    </div>
  );
}
