"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  newTitle: string;
  onSwitch: () => void;
  onDismiss: () => void;
};

/** Inline banner when host changes the event room default video. */
export function DefaultVideoSwitchPrompt({
  newTitle,
  onSwitch,
  onDismiss,
}: Props) {
  return (
    <div className="absolute top-2 right-2 left-2 z-50 flex items-start gap-2 rounded-md border border-white/20 bg-black/85 p-3 text-white shadow-lg sm:left-auto sm:max-w-sm">
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">New streaming video</p>
        <p className="truncate text-white/80">
          Host set &ldquo;{newTitle || "a new video"}&rdquo; as the default.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-white text-black hover:bg-white/90"
            onClick={onSwitch}
          >
            Switch to new video
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/40 text-white hover:bg-white/10"
            onClick={onDismiss}
          >
            Keep watching
          </Button>
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
