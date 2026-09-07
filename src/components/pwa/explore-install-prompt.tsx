"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import {
  shouldShowManualInstallAffordance,
  subscribePwaPreferenceRefresh,
} from "@/lib/pwa-install-trigger";
import {
  fetchPwaPreference,
  markPwaInstalled,
  type PwaPreferenceRecord,
} from "@/lib/pwa-preference-client";
import { currentAppPath } from "@/lib/app-path";
import { getPwaInstallInstructions } from "@/lib/pwa-utils";

/** Manual install affordance — ignores do_not_show; shown after at least one dismiss. */
export function ExploreInstallPrompt() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [preference, setPreference] = useState<PwaPreferenceRecord | null>(
    null
  );
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const manualInstall = getPwaInstallInstructions();

  const refreshPreference = useCallback(() => {
    void fetchPwaPreference().then(setPreference);
  }, []);

  useEffect(() => {
    refreshPreference();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshPreference();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const unsub = subscribePwaPreferenceRefresh(refreshPreference);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      unsub();
    };
  }, [refreshPreference]);

  const showManual = shouldShowManualInstallAffordance(preference, installed);

  if (!showManual || sessionDismissed) return null;

  const handleInstallClick = () => {
    if (canInstall) {
      void promptInstall().then(ok => {
        if (ok) void markPwaInstalled(currentAppPath());
      });
      return;
    }
    setShowManualHelp(true);
  };

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
        <p className="text-foreground text-sm font-medium">
          {manualInstall.title.replace(/:$/, "")}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Add to your home screen for quick access to Explore and live tipping.
        </p>
        {showManualHelp && !canInstall ? (
          <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-4 text-xs">
            {manualInstall.steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-black"
            onClick={handleInstallClick}
          >
            {canInstall
              ? "Install"
              : manualInstall.variant === "ios"
                ? "Add to Home Screen"
                : manualInstall.variant === "android"
                  ? "Install app"
                  : manualInstall.variant === "desktop-safari"
                    ? "Add to Dock"
                    : "How to install"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSessionDismissed(true)}
          >
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground shrink-0 rounded p-1"
        aria-label="Dismiss install prompt"
        onClick={() => setSessionDismissed(true)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
