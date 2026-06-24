"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import {
  markPwaDismissed,
  markPwaInstalled,
} from "@/lib/pwa-preference-client";
import type { PwaPreferenceSnapshot } from "@/lib/pwa-install-trigger";
import {
  PWA_INSTALL_SHEET_OVERLAY_Z_INDEX,
  PWA_INSTALL_SHEET_Z_INDEX,
} from "@/lib/drawer-z-index";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreferenceChange?: (pref: PwaPreferenceSnapshot | null) => void;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function InstallPromptSheet({
  open,
  onOpenChange,
  onPreferenceChange,
}: Props) {
  const { canInstall, promptInstall } = useInstallPrompt();

  const handleDismiss = async () => {
    const pref = await markPwaDismissed().catch(() => null);
    onPreferenceChange?.(pref);
    onOpenChange(false);
  };

  const handleInstall = async () => {
    if (canInstall) {
      const ok = await promptInstall();
      if (ok) {
        const pref = await markPwaInstalled().catch(() => null);
        onPreferenceChange?.(pref);
        onOpenChange(false);
      }
      return;
    }
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="bottom"
        overlayClassName={`!z-[100023] ${PWA_INSTALL_SHEET_OVERLAY_Z_INDEX}`}
        className={`!z-[100024] rounded-t-2xl ${PWA_INSTALL_SHEET_Z_INDEX}`}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Download className="size-5" />
            Install Tipmanna
          </SheetTitle>
          <SheetDescription>
            Add Tipmanna to your home screen for faster access to live TV and
            tipping.
          </SheetDescription>
        </SheetHeader>

        {!canInstall ? (
          <div className="text-muted-foreground mt-4 space-y-2 text-sm">
            {isIos() ? (
              <>
                <p className="text-foreground font-medium">
                  On iPhone or iPad:
                </p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Tap the Share button in Safari</li>
                  <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                  <li>Tap Add</li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium">On Android:</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open the browser menu (three dots)</li>
                  <li>
                    Tap &quot;Install app&quot; or &quot;Add to Home
                    screen&quot;
                  </li>
                </ol>
              </>
            )}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => void handleDismiss()}
          >
            Not now
          </Button>
          <Button
            type="button"
            className="flex-1 bg-black"
            onClick={() => void handleInstall()}
          >
            {canInstall ? "Install" : "Got it"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
