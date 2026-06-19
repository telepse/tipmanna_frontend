"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSelector } from "react-redux";
import { setPushAuthToken } from "@/lib/push-auth-cache";
import {
  listPushSubscriptionsAction,
  subscribePushAction,
} from "@/actions/notifications";
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

async function persistPushSubscription(
  sub: PushSubscription,
  authToken?: string | null
): Promise<void> {
  const json = sub.toJSON();
  const subscribeRes = await subscribePushAction(
    {
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    },
    authToken
  );
  if (!subscribeRes.success) {
    throw new Error(
      subscribeRes.message || "Failed to register push subscription"
    );
  }
}

async function hasBackendPushSubscription(
  authToken?: string | null
): Promise<boolean> {
  if (!authToken) return false;
  const res = await listPushSubscriptionsAction(authToken);
  if (!res.success) return false;
  const subs = res.data?.subscriptions;
  return Array.isArray(subs) && subs.length > 0;
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
): Promise<{ state: PushPermissionState; syncError?: string }> {
  if (typeof window === "undefined") return { state: "default" };
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { state: "unsupported" };
  }

  const perm = Notification.permission;
  if (perm === "denied") return { state: "denied" };
  if (perm === "default") return { state: "default" };

  const localSub = await getLocalPushSubscription();
  if (!localSub) return { state: "granted" };

  let syncError: string | undefined;
  if (opts?.syncToBackend && userId && authToken) {
    try {
      await setPushAuthToken(authToken);
      await persistPushSubscription(localSub, authToken);
    } catch (e) {
      syncError =
        e instanceof Error ? e.message : "Could not sync push to server";
    }
  }

  if (authToken && (await hasBackendPushSubscription(authToken))) {
    return { state: "subscribed" };
  }

  return { state: "granted", syncError };
}

export type PushPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "subscribed";

type PushPermissionSnapshot = {
  state: PushPermissionState;
  detecting: boolean;
  loading: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();

let snapshot: PushPermissionSnapshot = {
  state: "default",
  detecting: true,
  loading: false,
  error: null,
};

let detectRunId = 0;
let detectPromise: Promise<void> | null = null;

function emitPushPermissionChange() {
  for (const listener of listeners) listener();
}

function setSnapshot(patch: Partial<PushPermissionSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  emitPushPermissionChange();
}

function applySharedState(next: PushPermissionState) {
  setSnapshot({ state: mergePushState(snapshot.state, next) });
}

function subscribePushPermissionStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_SNAPSHOT: PushPermissionSnapshot = {
  state: "default",
  detecting: true,
  loading: false,
  error: null,
};

function getPushPermissionServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function getPushPermissionSnapshot() {
  return snapshot;
}

async function runPushPermissionDetect(
  userId: string | undefined,
  authToken: string | null | undefined
) {
  const runId = ++detectRunId;
  setSnapshot({ detecting: true });

  const { state: next, syncError } = await resolvePushPermissionState(
    userId,
    authToken,
    { syncToBackend: true }
  );

  if (runId !== detectRunId) return;
  applySharedState(next);
  setSnapshot({
    detecting: false,
    error: next === "granted" && syncError ? syncError : null,
  });
}

function schedulePushPermissionDetect(
  userId: string | undefined,
  authToken: string | null | undefined
) {
  detectPromise = runPushPermissionDetect(userId, authToken).finally(() => {
    detectPromise = null;
  });
  return detectPromise;
}

export function usePushPermission() {
  const userId = useSelector((s: RootState) => s.auth.user?.id);
  const authToken = useSelector((s: RootState) => s.auth.token);
  const { state, detecting, loading, error } = useSyncExternalStore(
    subscribePushPermissionStore,
    getPushPermissionSnapshot,
    getPushPermissionServerSnapshot
  );
  const subscribeRunRef = useRef(0);

  useEffect(() => {
    setSnapshot({ detecting: true, error: null });
    void schedulePushPermissionDetect(userId, authToken);
  }, [userId, authToken]);

  const subscribe = useCallback(async () => {
    const runId = ++subscribeRunRef.current;
    detectRunId += 1;
    setSnapshot({ error: null });

    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      applySharedState("unsupported");
      setSnapshot({
        error: "Push notifications are not supported on this device.",
      });
      return false;
    }

    if (!userId) {
      setSnapshot({ error: "Sign in to enable push notifications." });
      return false;
    }

    setSnapshot({ loading: true });
    try {
      if (authToken) await setPushAuthToken(authToken);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        applySharedState(permission === "denied" ? "denied" : "default");
        setSnapshot({ error: "Notification permission was not granted." });
        return false;
      }

      const publicKey = await fetchVapidPublicKey();
      const sub = await getOrCreatePushSubscription(publicKey);
      await persistPushSubscription(sub, authToken);
      const confirmed = await hasBackendPushSubscription(authToken);
      if (!confirmed) {
        throw new Error("Push subscription was not saved on the server");
      }
      if (runId !== subscribeRunRef.current) return true;
      applySharedState("subscribed");
      setSnapshot({ detecting: false });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Push subscription failed";
      setSnapshot({ error: msg });
      return false;
    } finally {
      if (runId === subscribeRunRef.current) {
        setSnapshot({ loading: false });
      }
    }
  }, [authToken, userId]);

  return { state, detecting, loading, error, subscribe };
}
