"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { InstallPromptSheet } from "@/components/pwa/install-prompt-sheet";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import {
  fetchPwaPromptPolicy,
  hasPromptAFiredThisSession,
  hasPromptBFiredThisSession,
  isDashboardPath,
  isPwaAutoPromptSuppressed,
  markPromptAFiredThisSession,
  markPromptBFiredThisSession,
  readDwellElapsedMs,
  requestPwaPrompt,
  subscribePwaPrompt,
  writeDwellElapsedMs,
  type PwaInstallTrigger,
  type PwaPreferenceSnapshot,
  type PromptPolicySnapshot,
} from "@/lib/pwa-install-trigger";
import {
  fetchPwaPreference,
  incrementPwaPaymentCount,
  type PwaPreferenceRecord,
} from "@/lib/pwa-preference-client";

export function PwaInstallController() {
  const pathname = usePathname() ?? "";
  const { installed } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<PwaPreferenceRecord | null>(
    null
  );
  const [policy, setPolicy] = useState<PromptPolicySnapshot | null>(null);
  const prefRef = useRef<PwaPreferenceRecord | null>(null);
  const policyRef = useRef<PromptPolicySnapshot | null>(null);
  const installedRef = useRef(installed);
  const promptARef = useRef(hasPromptAFiredThisSession());
  const promptBRef = useRef(hasPromptBFiredThisSession());

  installedRef.current = installed;
  prefRef.current = preference;
  policyRef.current = policy;

  const refreshPreference = useCallback(async () => {
    const pref = await fetchPwaPreference();
    setPreference(pref);
    prefRef.current = pref;
    return pref;
  }, []);

  const loadPolicy = useCallback(async () => {
    const p = await fetchPwaPromptPolicy();
    setPolicy(p);
    policyRef.current = p;
    return p;
  }, []);

  const tryOpenPrompt = useCallback(
    async (trigger: PwaInstallTrigger, slot: "A" | "B") => {
      const pol = policyRef.current ?? (await loadPolicy());
      if (!pol.enabled || !pol.publishedAt) return;
      if (isDashboardPath(pathname)) return;

      const pref = prefRef.current ?? (await refreshPreference());
      if (isPwaAutoPromptSuppressed(pref, installedRef.current)) return;

      if (slot === "A") {
        if (promptARef.current || hasPromptAFiredThisSession()) return;
        promptARef.current = true;
        markPromptAFiredThisSession();
      } else {
        if (!pol.secondPromptEnabled) return;
        if (promptBRef.current || hasPromptBFiredThisSession()) return;
        if (trigger === "payment" && !pol.afterPaymentEnabled) return;
        if (trigger === "engagement" && !pol.afterEngagementEnabled) return;
        if (trigger === "dwell" && pol.afterDwellMinutes <= 0) return;
        promptBRef.current = true;
        markPromptBFiredThisSession();
        if (trigger === "payment") {
          await incrementPwaPaymentCount();
          await refreshPreference();
        }
      }

      if (isPwaAutoPromptSuppressed(prefRef.current, installedRef.current)) {
        return;
      }

      setOpen(true);
    },
    [loadPolicy, pathname, refreshPreference]
  );

  useEffect(() => {
    void refreshPreference();
    void loadPolicy();
  }, [loadPolicy, refreshPreference]);

  useEffect(() => {
    return subscribePwaPrompt(trigger => {
      if (trigger === "landing") {
        void tryOpenPrompt("landing", "A");
        return;
      }
      void tryOpenPrompt(trigger, "B");
    });
  }, [tryOpenPrompt]);

  useEffect(() => {
    if (installed || isDashboardPath(pathname)) return;
    let cancelled = false;
    let timer: number | undefined;

    void loadPolicy().then(pol => {
      if (cancelled || !pol.enabled || !pol.publishedAt) return;
      timer = window.setTimeout(() => {
        if (!cancelled) requestPwaPrompt("landing");
      }, pol.landingDelaySec * 1000);
    });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [installed, loadPolicy, pathname]);

  useEffect(() => {
    if (installed) {
      setOpen(false);
    }
  }, [installed]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (installed || isDashboardPath(pathname)) return;

    let elapsed = readDwellElapsedMs();
    let lastTick = document.visibilityState === "visible" ? Date.now() : null;
    let dwellFired = false;

    const tick = () => {
      const pol = policyRef.current;
      if (!pol?.secondPromptEnabled || pol.afterDwellMinutes <= 0) return;
      if (document.visibilityState !== "visible") return;
      if (isPwaAutoPromptSuppressed(prefRef.current, installedRef.current)) {
        return;
      }
      const now = Date.now();
      if (lastTick != null) {
        elapsed += now - lastTick;
      }
      lastTick = now;
      writeDwellElapsedMs(elapsed);

      if (
        !dwellFired &&
        elapsed >= pol.afterDwellMinutes * 60 * 1000 &&
        !hasPromptBFiredThisSession()
      ) {
        dwellFired = true;
        requestPwaPrompt("dwell");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastTick = Date.now();
      } else if (lastTick != null) {
        elapsed += Date.now() - lastTick;
        lastTick = null;
        writeDwellElapsedMs(elapsed);
      }
    };

    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      if (lastTick != null && document.visibilityState === "visible") {
        elapsed += Date.now() - lastTick;
        writeDwellElapsedMs(elapsed);
      }
    };
  }, [installed, pathname]);

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
