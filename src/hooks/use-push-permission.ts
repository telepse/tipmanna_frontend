"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

async function getLocalPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function getOrCreatePushSubscription(
  publicKey: string
): Promise<PushSubscription> {
  const existing = await getLocalPushSubscription();
  if (existing) return existing;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as
      | string
      | BufferSource
      | null
      | undefined,
  });
}

/** Never downgrade from subscribed — stale async sync must not re-show the prompt. */
function mergePushState(
  prev: PushPermissionState,
  next: PushPermissionState
): PushPermissionState {
  if (prev === "subscribed" && next === "granted") return prev;
  return next;
}

async function resolvePushPermissionState(
  userId: string | undefined,
  authToken: string | null | undefined,
  opts?: { syncToBackend?: boolean }
): Promise<PushPermissionState> {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return "unsupported";
  }

  const perm = Notification.permission;
  if (perm === "denied") return "denied";
  if (perm === "default") return "default";

  const localSub = await getLocalPushSubscription();
  if (!localSub) return "granted";

  if (opts?.syncToBackend && userId && authToken) {
    try {
      await setPushAuthToken(authToken);
      await persistPushSubscription(localSub);
    } catch {
      // Browser is subscribed; keep prompt hidden even if backend sync fails.
    }
  }

  return "subscribed";
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
  const detectRunRef = useRef(0);

  const applyState = useCallback(
    (next: PushPermissionState | ((prev: PushPermissionState) => PushPermissionState)) => {
      setState(prev =>
        mergePushState(
          prev,
          typeof next === "function" ? next(prev) : next
        )
      );
    },
    []
  );

  useEffect(() => {
    const runId = ++detectRunRef.current;
    let cancelled = false;

    void (async () => {
      const next = await resolvePushPermissionState(userId, authToken, {
        syncToBackend: true,
      });
      if (cancelled || runId !== detectRunRef.current) return;
      applyState(prev => mergePushState(prev, next));
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authToken, applyState]);

  const subscribe = useCallback(async () => {
    detectRunRef.current += 1;
    setError(null);
    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      applyState("unsupported");
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
        applyState(permission === "denied" ? "denied" : "default");
        setError("Notification permission was not granted.");
        return false;
      }

      const publicKey = await fetchVapidPublicKey();
      const sub = await getOrCreatePushSubscription(publicKey);
      await persistPushSubscription(sub);
      applyState("subscribed");
      return true;
    } catch (e) {
      const localSub = await getLocalPushSubscription();
      if (localSub) {
        // Browser subscription exists; hide prompt and retry backend sync on remount.
        applyState("subscribed");
        return true;
      }
      const msg = e instanceof Error ? e.message : "Push subscription failed";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [applyState, authToken, userId]);

  return { state, loading, error, subscribe };
}
