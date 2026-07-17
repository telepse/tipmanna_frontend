"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { InstallPromptSheet } from "@/components/pwa/install-prompt-sheet";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import {
  consumePendingPaymentPrompt,
  hasEngagementFiredThisSession,
  isPwaAutoPromptSuppressed,
  markEngagementFiredThisSession,
  PWA_ENGAGEMENT_MS,
  readEngagementElapsedMs,
  requestPwaPrompt,
  subscribePwaPrompt,
  writeEngagementElapsedMs,
  type PwaInstallTrigger,
  type PwaPreferenceSnapshot,
} from "@/lib/pwa-install-trigger";
import {
  fetchPwaPreference,
  incrementPwaPaymentCount,
  type PwaPreferenceRecord,
} from "@/lib/pwa-preference-client";

const PAYMENT_PROMPT_DELAY_MS = 3500;

export function PwaInstallController() {
  const { installed } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<PwaPreferenceRecord | null>(
    null
  );
  const prefRef = useRef<PwaPreferenceRecord | null>(null);
  const installedRef = useRef(installed);
  const engagementFiredRef = useRef(hasEngagementFiredThisSession());

  installedRef.current = installed;
  prefRef.current = preference;

  const refreshPreference = useCallback(async () => {
    const pref = await fetchPwaPreference();
    setPreference(pref);
    prefRef.current = pref;
    return pref;
  }, []);

  const tryOpenAutoPrompt = useCallback(
    async (trigger: PwaInstallTrigger) => {
      const pref = prefRef.current ?? (await refreshPreference());
      if (isPwaAutoPromptSuppressed(pref, installedRef.current)) return;

      if (trigger === "engagement") {
        if (engagementFiredRef.current || hasEngagementFiredThisSession()) {
          return;
        }
        engagementFiredRef.current = true;
        markEngagementFiredThisSession();
      }

      if (trigger === "payment") {
        await incrementPwaPaymentCount();
        await refreshPreference();
      }

      if (isPwaAutoPromptSuppressed(prefRef.current, installedRef.current)) {
        return;
      }

      setOpen(true);
    },
    [refreshPreference]
  );

  useEffect(() => {
    void refreshPreference();
  }, [refreshPreference]);

  useEffect(() => {
    return subscribePwaPrompt(trigger => {
      void tryOpenAutoPrompt(trigger);
    });
  }, [tryOpenAutoPrompt]);

  useEffect(() => {
    if (consumePendingPaymentPrompt()) {
      window.setTimeout(() => {
        requestPwaPrompt("payment");
      }, PAYMENT_PROMPT_DELAY_MS);
    }
  }, []);

  useEffect(() => {
    if (installed) {
      setOpen(false);
    }
  }, [installed]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (installed) return;

    let elapsed = readEngagementElapsedMs();
    let lastTick = document.visibilityState === "visible" ? Date.now() : null;
    let fired = engagementFiredRef.current || hasEngagementFiredThisSession();

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (isPwaAutoPromptSuppressed(prefRef.current, installedRef.current)) {
        return;
      }
      const now = Date.now();
      if (lastTick != null) {
        elapsed += now - lastTick;
      }
      lastTick = now;
      writeEngagementElapsedMs(elapsed);

      if (!fired && elapsed >= PWA_ENGAGEMENT_MS) {
        fired = true;
        engagementFiredRef.current = true;
        requestPwaPrompt("engagement");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastTick = Date.now();
      } else if (lastTick != null) {
        elapsed += Date.now() - lastTick;
        lastTick = null;
        writeEngagementElapsedMs(elapsed);
      }
    };

    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      if (lastTick != null && document.visibilityState === "visible") {
        elapsed += Date.now() - lastTick;
        writeEngagementElapsedMs(elapsed);
      }
    };
  }, [installed]);

  const handleOpenChange = (next: boolean) => {
    if (
      next &&
      isPwaAutoPromptSuppressed(prefRef.current, installedRef.current)
    ) {
      return;
    }
    setOpen(next);
    if (!next) {
      void refreshPreference();
    }
  };

  const suppressed = isPwaAutoPromptSuppressed(preference, installed);

  return (
    <InstallPromptSheet
      open={open && !suppressed}
      onOpenChange={handleOpenChange}
      onPreferenceChange={(pref: PwaPreferenceSnapshot | null) => {
        setPreference(pref as PwaPreferenceRecord | null);
        prefRef.current = pref as PwaPreferenceRecord | null;
      }}
    />
  );
}
