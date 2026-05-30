"use client";

import { EVENT_VIDEO_TYPE_OPTIONS } from "@/lib/event-video-type-options";
import { cn } from "@/lib/utils";

export type EventVideoTypeTagTone = "dark" | "light";

export interface EventVideoTypeTagPickerProps {
  /** Undefined / empty means “same as event type”. */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  inheritLabel?: string;
  /** Appended to inherit tag for context (e.g. raw EventType enum). */
  inheritSuffix?: string;
  tone?: EventVideoTypeTagTone;
  className?: string;
}

function isInherit(v: string | undefined): boolean {
  return v === undefined || v === "";
}

/**
 * Mutually exclusive event video type chips (Explore / TV taxonomy).
 */
export function EventVideoTypeTagPicker({
  value,
  onChange,
  inheritLabel = "",
  inheritSuffix,
  tone = "dark",
  className,
}: EventVideoTypeTagPickerProps) {
  const inheritSelected = isInherit(value);

  const baseTag =
    tone === "dark"
      ? "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
      : "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

  const idleDark =
    "border-white/25 bg-black/20 text-white hover:bg-black/35 hover:border-white/40";
  const selectedDark =
    "border-white bg-white text-black hover:bg-white/90 hover:text-black";

  const idleLight =
    "border-border bg-muted/40 text-foreground hover:bg-muted hover:border-muted-foreground/30";
  const selectedLight =
    "border-primary bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {EVENT_VIDEO_TYPE_OPTIONS.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            className={cn(
              baseTag,
              tone === "dark"
                ? selected
                  ? selectedDark
                  : idleDark
                : selected
                  ? selectedLight
                  : idleLight
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
