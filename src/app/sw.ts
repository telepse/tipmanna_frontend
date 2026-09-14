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

function pushKindLabel(recipientKind?: string, kindLabel?: string): string {
  if (kindLabel?.trim()) return kindLabel.trim();
  if (recipientKind === "host") return "Host";
  if (recipientKind === "tipper") return "Tipper";
  return "Tipmanna";
}

function resolveNotificationDeepLink(data: {
  deepLink?: string;
  recipientKind?: string | null;
}): string {
  const raw = data.deepLink?.trim() || "/explore?drawer=notifications";
  if (
    raw.includes("notifications=host") ||
    raw.includes("notifications=tipper")
  ) {
    return raw;
  }
  if (data.recipientKind === "host") {
    return "/explore?drawer=notifications&notifications=host";
  }
  if (data.recipientKind === "tipper") {
    return "/explore?drawer=notifications&notifications=tipper";
  }
  return raw;
}

async function recordNotificationRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId, action: "read" }),
    });
  } catch (e) {
    console.error("[sw] notification read failed", e);
  }
}

async function recordNotificationClick(
  notificationId: string,
  url: string
): Promise<void> {
  if (!notificationId) return;
  try {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId, action: "click", url }),
    });
  } catch (e) {
    console.error("[sw] notification click failed", e);
  }
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    deepLink?: string;
    linkUrl?: string;
    notificationId?: string;
    recipientKind?: string;
    kindLabel?: string;
    actions?: { action: string; title: string }[];
  } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Tipmanna", body: event.data?.text() || "" };
  }

  const label = pushKindLabel(payload.recipientKind, payload.kindLabel);
  const title = payload.title
    ? `[${label}] ${payload.title}`
    : `[${label}] Tipmanna`;
  const deepLink = resolveNotificationDeepLink({
    deepLink: payload.deepLink,
    recipientKind: payload.recipientKind,
  });
  const options: NotificationOptions & {
    actions?: { action: string; title: string }[];
  } = {
    body: payload.body || "",
    data: {
      deepLink,
      linkUrl: payload.linkUrl || null,
      notificationId: payload.notificationId || null,
      recipientKind: payload.recipientKind || null,
    },
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.notificationId
      ? `notification-${payload.notificationId}`
      : `notification-${label.toLowerCase()}`,
  };
  if (payload.linkUrl) {
    options.actions = payload.actions ?? [
      { action: "open-link", title: "Open link" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data || {}) as {
    deepLink?: string;
    linkUrl?: string | null;
    notificationId?: string | null;
    recipientKind?: string | null;
  };
  const deepLink = resolveNotificationDeepLink(data);
  const linkUrl = data.linkUrl || null;
  const notificationId = data.notificationId;
  const useLinkAction = event.action === "open-link" && linkUrl;
  const targetPath = useLinkAction ? linkUrl : deepLink;
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      if (notificationId) {
        await recordNotificationRead(notificationId);
        if (!useLinkAction) {
          await recordNotificationClick(notificationId, targetUrl);
        }
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
