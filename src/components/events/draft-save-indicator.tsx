"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  saving?: boolean;
  lastSavedAt?: Date | null;
  saveError?: string | null;
  onSaveNow?: () => void;
  /** When true, show neutral hint instead of autosave enabled / error. */
  hostAuthRequired?: boolean;
  className?: string;
};

export function DraftSaveIndicator({
  saving = false,
  lastSavedAt = null,
  saveError = null,
  onSaveNow,
  hostAuthRequired = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-2 text-xs",
        className
      )}
    >
      {saving ? (
        <span className="inline-flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
          Saving draft…
        </span>
      ) : saveError ? (
        <span className="text-destructive">{saveError}</span>
      ) : hostAuthRequired ? (
        <span className="text-white/55">Sign in as host to save drafts</span>
      ) : lastSavedAt ? (
        <span>Draft saved {lastSavedAt.toLocaleTimeString()}</span>
      ) : (
        <span>Draft autosave enabled</span>
      )}
      {onSaveNow ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={saving}
          onClick={onSaveNow}
        >
          Save to draft
        </Button>
      ) : null}
    </div>
  );
}
