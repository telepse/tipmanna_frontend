"use client";

import { toast } from "react-toastify";

const SESSION_KEY = "tipmanna_chunk_reload";

export function isChunkLoadError(reason: unknown): boolean {
  if (!reason) return false;
  const msg =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? reason.message
        : typeof (reason as { message?: string }).message === "string"
          ? (reason as { message: string }).message
          : "";
  const name =
    reason instanceof Error
      ? reason.name
      : typeof (reason as { name?: string }).name === "string"
        ? (reason as { name: string }).name
        : "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to load chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/** Full navigation reload so the browser picks up the latest deployed HTML/chunks. */
export async function hardReloadForLatestBuild(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
    } catch {
      /* noop */
    }
  }

  window.location.reload();
}

/**
 * After PWA deploys, stale chunks can fail to load. Reload once per session.
 */
export function installChunkLoadRecovery(): void {
  if (typeof window === "undefined") return;

  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    toast.info("New version available — refreshing.", { autoClose: 2000 });
    window.setTimeout(() => {
      void hardReloadForLatestBuild();
    }, 500);
  };

  window.addEventListener("unhandledrejection", event => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadOnce();
    }
  });

  window.addEventListener("error", event => {
    if (isChunkLoadError(event.error ?? event.message)) {
      event.preventDefault();
      reloadOnce();
    }
  });
}
