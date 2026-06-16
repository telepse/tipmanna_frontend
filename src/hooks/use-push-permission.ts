"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { setPushAuthToken } from "@/lib/push-auth-cache";
import { subscribePushAction } from "@/actions/notifications";
import type { RootState } from "@/redux/store";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_API_URL || "").replace(/\/$/, "");
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function fetchVapidPublicKey(): Promise<string> {
  const vapidRes = await fetch(
    `${apiBase()}/notifications/push/vapid-public-key`
  );
  if (!vapidRes.ok) {
    throw new Error("Could not load push configuration");
  }
  const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
  if (!publicKey) {
    throw new Error("Push is not configured on the server");
  }
  return publicKey;
}

async function persistPushSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const subscribeRes = await subscribePushAction({
    endpoint: json.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent,
  });
  if (!subscribeRes.success) {
    throw new Error(
      subscribeRes.message || "Failed to register push subscription"
    );
  }
}

async function getOrCreatePushSubscription(
  publicKey: string
): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as
      | string
      | BufferSource
      | null
      | undefined,
  });
}

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "subscribed";

export function usePushPermission() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const [state, setState] = useState<PushPermissionState>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncPushSubscription = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      if (typeof window === "undefined") return false;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        return false;
      }
      if (!userId || !authToken) return false;
      if (Notification.permission !== "granted") return false;

      try {
        await setPushAuthToken(authToken);
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (!existing) return false;

        await persistPushSubscription(existing);
        setState("subscribed");
        return true;
      } catch (e) {
        if (!opts?.silent) {
          const msg =
            e instanceof Error ? e.message : "Push subscription failed";
          setError(msg);
        }
        return false;
      }
    },
    [authToken, userId]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    const perm = Notification.permission;
    if (perm === "denied") {
      setState("denied");
      return;
    }
    if (perm === "default") {
      setState("default");
      return;
    }

    if (!userId || !authToken) {
      setState("granted");
      return;
    }

    let cancelled = false;
    void (async () => {
      const ok = await syncPushSubscription({ silent: true });
      if (cancelled) return;
      setState(ok ? "subscribed" : "granted");
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authToken, syncPushSubscription]);

  const subscribe = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      setError("Push notifications are not supported on this device.");
      return false;
    }

    if (!userId) {
      setError("Sign in to enable push notifications.");
      return false;
    }

    setLoading(true);
    try {
      if (authToken) await setPushAuthToken(authToken);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        setError("Notification permission was not granted.");
        return false;
      }

      const publicKey = await fetchVapidPublicKey();
      const sub = await getOrCreatePushSubscription(publicKey);
      await persistPushSubscription(sub);
      setState("subscribed");
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Push subscription failed";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [authToken, userId]);

  return { state, loading, error, subscribe };
}
