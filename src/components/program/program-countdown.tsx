"use client";

import { useEffect, useMemo, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms: number) {
  if (ms <= 0) {
    return { label: "Live now", ended: false, live: true };
  }
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts = [
    days > 0 ? `${days}d` : null,
    `${pad(hours)}h`,
    `${pad(minutes)}m`,
    `${pad(seconds)}s`,
  ].filter(Boolean);
  return { label: parts.join(" "), ended: false, live: false };
}

export function ProgramCountdown({
  scheduledAt,
  durationSec,
  className,
}: {
  scheduledAt: string;
  durationSec: number;
  className?: string;
}) {
  const startMs = useMemo(() => new Date(scheduledAt).getTime(), [scheduledAt]);
  const endMs = useMemo(
    () => startMs + durationSec * 1000,
    [startMs, durationSec]
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const untilStart = startMs - now;
  const untilEnd = endMs - now;

  if (untilEnd <= 0) {
    return (
      <p className={className ?? "text-muted-foreground text-sm"}>
        Program ended
      </p>
    );
  }

  if (untilStart <= 0) {
    const live = formatCountdown(untilEnd);
    return (
      <p className={className ?? "text-sm font-medium text-emerald-600"}>
        On air · {live.label} remaining
      </p>
    );
  }

  const upcoming = formatCountdown(untilStart);
  return (
    <p className={className ?? "text-muted-foreground text-sm"}>
      Starts in {upcoming.label}
    </p>
  );
}
