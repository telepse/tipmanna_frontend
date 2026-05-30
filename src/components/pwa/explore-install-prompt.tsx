"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/** Lightweight install banner on Explore when `beforeinstallprompt` is available. */
export function ExploreInstallPrompt() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (installed || dismissed || !canInstall) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Tipmanna app"
      className="border-border fixed right-4 bottom-4 left-4 z-[13000] flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg sm:left-auto sm:max-w-sm"
    >
      <Download
        className="text-primary mt-0.5 size-5 shrink-0"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">Install Tipmanna</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Add to your home screen for quick access to Explore and live tipping.
        </p>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-black"
            onClick={() =>
              void promptInstall().then(ok => ok && setDismissed(true))
            }
          >
            Install
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDismissed(true)}
          >
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
        aria-label="Dismiss install prompt"
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
