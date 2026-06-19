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

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Manual install affordance — ignores do_not_show; shown after at least one dismiss. */
export function ExploreInstallPrompt() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [preference, setPreference] = useState<PwaPreferenceRecord | null>(
    null
  );
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

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
        if (ok) void markPwaInstalled();
      });
      return;
    }
    if (isIos()) {
      setShowIosHelp(true);
    }
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
        <p className="text-foreground text-sm font-medium">Install Tipmanna</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Add to your home screen for quick access to Explore and live tipping.
        </p>
        {showIosHelp && !canInstall ? (
          <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-4 text-xs">
            <li>Tap the Share button in Safari</li>
            <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
            <li>Tap Add</li>
          </ol>
        ) : null}
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-black"
            onClick={handleInstallClick}
          >
            {canInstall ? "Install" : isIos() ? "How to install" : "Install"}
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
