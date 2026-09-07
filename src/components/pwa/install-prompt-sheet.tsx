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
import { currentAppPath } from "@/lib/app-path";
import type { PwaPreferenceSnapshot } from "@/lib/pwa-install-trigger";
import {
  PWA_INSTALL_SHEET_OVERLAY_Z_INDEX,
  PWA_INSTALL_SHEET_Z_INDEX,
} from "@/lib/drawer-z-index";
import { getPwaInstallInstructions } from "@/lib/pwa-utils";
import { readPendingPushOptIn } from "@/lib/pending-push-opt-in";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreferenceChange?: (pref: PwaPreferenceSnapshot | null) => void;
}

export function InstallPromptSheet({
  open,
  onOpenChange,
  onPreferenceChange,
}: Props) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const pendingPush = readPendingPushOptIn();
  const installInstructions = getPwaInstallInstructions({
    forPush: Boolean(pendingPush),
  });

  const handleDismiss = async () => {
    const pref = await markPwaDismissed().catch(() => null);
    onPreferenceChange?.(pref);
    onOpenChange(false);
  };

  const handleInstall = async () => {
    if (canInstall) {
      const ok = await promptInstall();
      if (ok) {
        const pref = await markPwaInstalled(currentAppPath()).catch(() => null);
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
            {pendingPush ? "Install for push alerts" : "Install Tipmanna"}
          </SheetTitle>
          <SheetDescription>
            {pendingPush
              ? "Push notifications on iPhone only work after you add Tipmanna to your Home Screen and open it from there."
              : "Add Tipmanna to your home screen for faster access to live TV and tipping."}
          </SheetDescription>
        </SheetHeader>

        {!canInstall ? (
          <div className="text-muted-foreground mt-4 space-y-2 text-sm">
            <p className="text-foreground font-medium">
              {installInstructions.title}
            </p>
            <ol className="list-decimal space-y-1 pl-4">
              {installInstructions.steps.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ol>
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
