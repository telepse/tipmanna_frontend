"use client";

import { useEffect, useState } from "react";

import { InstallPromptSheet } from "@/components/pwa/install-prompt-sheet";
import { getDeviceKey } from "@/lib/getAuthToken";
import { upsertPwaPreference } from "@/lib/pwa-preference-client";

function apiBase() {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

/** Schedules PWA install prompt 4–6s after payment success. */
export function PwaPostPaymentPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dk = getDeviceKey();
    const delay = 4000 + Math.floor(Math.random() * 2000);

    void fetch(
      `${apiBase()}/pwa/preference?deviceKey=${encodeURIComponent(dk)}`
    )
      .then(r => r.json())
      .then(async ({ preference }) => {
        const status = preference?.status as string | undefined;
        const paymentCount =
          (preference?.paymentCount as number | undefined) ?? 0;
        const nextCount = paymentCount + 1;

        await upsertPwaPreference(status ?? "prompted", {
          incrementPayment: true,
        });

        if (status === "do_not_show" || status === "installed") return;
        if (nextCount === 1 || (nextCount === 2 && status !== "dismissed")) {
          window.setTimeout(() => setOpen(true), delay);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <InstallPromptSheet
      open={open}
      onOpenChange={setOpen}
    />
  );
}
