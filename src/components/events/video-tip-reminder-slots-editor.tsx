"use client";

import { Input } from "@/components/ui/input";
import { TipPremiumIndicator } from "@/components/events/tip-premium-indicator";
import { isVideoTipReminderSlotLocked } from "@/lib/video-tip-reminder-slots";
import { cn } from "@/lib/utils";

type Props = {
  value: number[];
  onChange: (value: number[]) => void;
  hasActivePremium: boolean;
  disabled?: boolean;
  appearance?: "default" | "onDark";
};

function slotMinute(value: number[], slotIndex: number): string {
  const minute = value[slotIndex];
  return minute != null && minute > 0 ? String(minute) : "";
}

function buildRemindersFromSlots(
  slot0: string,
  slot1: string,
  hasActivePremium: boolean
): number[] {
  const nums = [slot0, slot1]
    .map(v => (v.trim() === "" ? NaN : Number(v)))
    .filter(v => Number.isFinite(v) && v > 0)
    .map(v => Math.floor(v));
  const max = hasActivePremium ? 2 : 1;
  return [...new Set(nums)].sort((a, b) => a - b).slice(0, max);
}

export function VideoTipReminderSlotsEditor({
  value,
  onChange,
  hasActivePremium,
  disabled = false,
  appearance = "default",
}: Props) {
  const onDark = appearance === "onDark";

  const updateSlot = (slotIndex: number, raw: string) => {
    const next = [
      slotIndex === 0 ? raw : slotMinute(value, 0),
      slotIndex === 1 ? raw : slotMinute(value, 1),
    ];
    onChange(buildRemindersFromSlots(next[0], next[1], hasActivePremium));
  };

  return (
    <div className="space-y-2">
      <h3 className={cn("text-sm font-semibold", onDark && "text-white")}>
        Fundraise reminders
      </h3>
      <p
        className={cn(
          "text-xs",
          onDark ? "text-white/80" : "text-muted-foreground"
        )}
      >
        Show reminders to viewers while they watch this video.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(slotIndex => {
          const locked = isVideoTipReminderSlotLocked(
            slotIndex,
            hasActivePremium
          );
          return (
            <div
              key={slotIndex}
              className="relative flex items-center gap-1 text-sm"
            >
              {locked ? (
                <TipPremiumIndicator className="absolute -top-1 -right-1 z-10" />
              ) : null}
              <span
                className={cn(
                  "shrink-0",
                  onDark ? "text-white/80" : "text-muted-foreground"
                )}
              >
                After
              </span>
              <Input
                type="number"
                min={1}
                disabled={disabled || locked}
                value={locked ? "" : slotMinute(value, slotIndex)}
                onChange={e => updateSlot(slotIndex, e.target.value)}
                className={cn(
                  "h-8 w-16 text-center",
                  onDark && "bg-black/20 text-white"
                )}
              />
              <span
                className={cn(
                  "shrink-0",
                  onDark ? "text-white/80" : "text-muted-foreground"
                )}
              >
                mins
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
