"use client";

import { isExploreE2eFixturesActiveOnClient } from "@/lib/explore-e2e-fixtures-gate";
import { getDeviceKey } from "@/lib/getAuthToken";
import {
  notifyPwaPreferenceRefresh,
  type PwaPreferenceSnapshot,
} from "@/lib/pwa-install-trigger";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

export type PwaPreferenceRecord = PwaPreferenceSnapshot & {
  id?: string;
  deviceKey?: string;
};

export async function fetchPwaPreference(): Promise<PwaPreferenceRecord | null> {
  if (isExploreE2eFixturesActiveOnClient()) return null;
  const deviceKey = getDeviceKey();
  const res = await fetch(
    `${apiBase()}/pwa/preference?deviceKey=${encodeURIComponent(deviceKey)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    preference?: PwaPreferenceRecord | null;
  };
  return data.preference ?? null;
}

export async function upsertPwaPreference(
  status: string,
  opts?: { incrementPayment?: boolean; incrementDismiss?: boolean }
): Promise<PwaPreferenceRecord | null> {
  if (isExploreE2eFixturesActiveOnClient()) return null;
  const deviceKey = getDeviceKey();
  const res = await fetch(`${apiBase()}/pwa/preference`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceKey,
      status,
      incrementPayment: opts?.incrementPayment ?? false,
      incrementDismiss: opts?.incrementDismiss ?? false,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    preference?: PwaPreferenceRecord | null;
    disabled?: boolean;
  };
  const preference = data.preference ?? null;
  if (preference) notifyPwaPreferenceRefresh();
  return preference;
}

export async function markPwaDismissed(): Promise<PwaPreferenceRecord | null> {
  return upsertPwaPreference("dismissed", { incrementDismiss: true });
}

export async function markPwaInstalled(): Promise<PwaPreferenceRecord | null> {
  return upsertPwaPreference("installed");
}

export async function incrementPwaPaymentCount(): Promise<PwaPreferenceRecord | null> {
  const existing = await fetchPwaPreference();
  return upsertPwaPreference(existing?.status ?? "prompted", {
    incrementPayment: true,
  });
}
