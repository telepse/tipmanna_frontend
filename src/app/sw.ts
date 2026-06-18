/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

let API_BASE = "";

function normalizeApiBase(base: string | undefined): string {
  if (!base || typeof base !== "string") return "";
  return base.replace(/\/$/, "");
}

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string; apiBase?: string } | undefined;
  if (data?.type === "SET_CONFIG") {
    API_BASE = normalizeApiBase(data.apiBase);
  }
});

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("tipmanna-push", 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv");
      }
    };
  });
}

async function getStoredToken(): Promise<string | null> {
  try {
    const db = await openDb();
    return new Promise(resolve => {
      const tx = db.transaction("kv", "readonly");
      const store = tx.objectStore("kv");
      const getReq = store.get("authToken");
      getReq.onsuccess = () => resolve((getReq.result as string) || null);
      getReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function recordNotificationClick(
  notificationId: string,
  url: string
): Promise<void> {
  if (!notificationId || !API_BASE) return;
  const token = await getStoredToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    await fetch(
      `${API_BASE}/notifications/${encodeURIComponent(notificationId)}/click`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ url: url || undefined }),
      }
    );
  } catch (e) {
    console.error("[sw] notification click failed", e);
  }
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    deepLink?: string;
    notificationId?: string;
  } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Tipmanna", body: event.data?.text() || "" };
  }

  const title = payload.title || "Tipmanna";
  const options: NotificationOptions = {
    body: payload.body || "",
    data: {
      deepLink: payload.deepLink || "/tv",
      notificationId: payload.notificationId || null,
    },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data || {}) as {
    deepLink?: string;
    notificationId?: string | null;
  };
  const deepLink = data.deepLink || "/tv";
  const notificationId = data.notificationId;
  const targetUrl = new URL(deepLink, self.location.origin).href;

  event.waitUntil(
    (async () => {
      if (notificationId) {
        await recordNotificationClick(notificationId, targetUrl);
      }

      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
