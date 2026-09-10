"use client";

import Image from "next/image";
import { BadgeCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  hostFirstName: string;
  sectionCta: string;
  onTipNow: () => void;
  onDismiss: () => void;
};

export function VideoTipReminderOverlay({
  hostFirstName,
  sectionCta,
  onTipNow,
  onDismiss,
}: Props) {
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-label="Tip reminder"
    >
      <div className="w-[min(92vw,300px)] space-y-4 rounded-xl bg-white p-6 text-center shadow-xl">
        <h3 className="text-base font-semibold">Reminder from host</h3>
        <p className="-mt-2 text-center">
          <span className="text-muted-foreground inline-flex items-center justify-center gap-1 text-xs">
            {hostFirstName}
            <BadgeCheck className="fill-primary size-5 text-black" />
          </span>
        </p>
        <Button
          variant="default"
          className="mb-2 flex w-full items-center justify-center gap-1 rounded-2xl bg-gray-200 text-sm text-black"
          onClick={onTipNow}
        >
          <Image
            src="/icons/love.png"
            alt=""
            width={20}
            height={20}
          />
          <Image
            src="/icons/star.png"
            alt=""
            width={20}
            height={20}
          />
          {sectionCta}
        </Button>
        <button
          type="button"
          className="text-muted-foreground text-xs underline"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
