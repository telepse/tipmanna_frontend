"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchPwaPreference,
  upsertPwaPreference,
} from "@/lib/pwa-preference-client";
import { currentAppPath } from "@/lib/app-path";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosStandalone(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isDisplayModeStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

async function detectInstalledRelatedApps(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<{ id?: string }[]>;
  };
  if (!nav.getInstalledRelatedApps) return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    return Array.isArray(apps) && apps.length > 0;
  } catch {
    return false;
  }
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [detectionSettled, setDetectionSettled] = useState(false);
  const persistedInstalledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const markInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      if (!persistedInstalledRef.current) {
        persistedInstalledRef.current = true;
        void upsertPwaPreference("installed", {
          installPath: currentAppPath(),
        }).catch(() => {});
      }
    };

    const finishDetection = () => {
      if (!cancelled) setDetectionSettled(true);
    };

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      markInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const runDetection = async () => {
      if (isDisplayModeStandalone() || isIosStandalone()) {
        markInstalled();
        finishDetection();
        return;
      }

      try {
        const pref = await fetchPwaPreference();
        if (pref?.status === "installed") {
          markInstalled();
          finishDetection();
          return;
        }
      } catch {
        /* ignore */
      }

      const foundRelated = await detectInstalledRelatedApps();
      if (foundRelated) {
        markInstalled();
      }
      finishDetection();
    };

    void runDetection();

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setInstalled(true);
      persistedInstalledRef.current = true;
      void upsertPwaPreference("installed", {
        installPath: currentAppPath(),
      }).catch(() => {});
    }
    return choice.outcome === "accepted";
  }, [deferredPrompt]);

  return {
    canInstall: Boolean(deferredPrompt) && !installed,
    installed,
    detectionSettled,
    promptInstall,
  };
}
