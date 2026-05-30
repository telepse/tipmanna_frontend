"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushPermission } from "@/hooks/use-push-permission";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function PushPermissionPrompt({ className }: Props) {
  const { state, loading, error, subscribe } = usePushPermission();

  if (state === "unsupported" || state === "denied" || state === "subscribed") {
    return null;
  }

  return (
    <div
      className={cn(
        "border-primary/30 bg-primary/5 mx-2 mb-3 flex items-start gap-3 rounded-lg border p-3",
        className
      )}
    >
      <Bell className="text-primary mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Enable push notifications</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Get reminders and updates when hosts you follow go live.
        </p>
        {error ? (
          <p className="text-destructive mt-1 text-xs">{error}</p>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="mt-2 bg-black"
          disabled={loading}
          onClick={() => void subscribe()}
        >
          {loading ? "Enabling…" : "Turn on notifications"}
        </Button>
      </div>
    </div>
  );
}
