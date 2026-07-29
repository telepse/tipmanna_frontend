import Image from "next/image";
import Link from "next/link";
import { Calendar, Tv } from "lucide-react";

import { Paragraph } from "@/components/shared/paragraph";
import { cn, formatProgramScheduleDisplay, getStatusColor } from "@/lib/utils";
import type { DiscoveryProgram } from "@/types/program.types";

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ScheduledTvProgramCard({
  title,
  scheduledAt,
  imageUrl,
  landingUrl,
  communityName,
  programStatus,
  durationSec,
}: DiscoveryProgram) {
  return (
    <div
      className="rounded-2xl border"
      style={{ backgroundImage: `linear-gradient(to left, #FFF, #FFF8F1)` }}
    >
      <Link
        href={landingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={320}
            height={180}
            className="h-[180px] w-[320px] rounded-t-2xl object-contain sm:object-cover"
          />
        ) : (
          <div className="bg-muted flex h-[180px] w-[320px] items-center justify-center rounded-t-2xl">
            <Tv className="size-8 text-neutral-500" />
          </div>
        )}
      </Link>

      <Link
        href={landingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block space-y-2 p-4"
      >
        <Paragraph
          size="lg"
          weight="bold"
        >
          {title.substring(0, 15)}
          {title.length > 20 ? "..." : ""}
        </Paragraph>

        <Paragraph
          size="sm"
          className="-mt-3 flex items-center justify-between gap-2"
        >
          <span className="text-xs whitespace-nowrap">
            {communityName.substring(0, 20)}
            {communityName.length > 20 ? "..." : ""}
          </span>
        </Paragraph>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            {durationSec != null && durationSec > 0 ? (
              <span className="text-muted-foreground flex gap-2 text-xs">
                Duration: {formatDuration(durationSec)}
              </span>
            ) : null}

            <span className="text-muted-foreground flex items-center gap-2 text-[10px]">
              Scheduled: {formatProgramScheduleDisplay(scheduledAt)}
            </span>
          </div>

          <span className={cn(getStatusColor(programStatus))}>
            {programStatus}
          </span>
        </div>
      </Link>
    </div>
  );
}
