import { isAnalyticsSdkEnabled } from "./flags";
import { pruneStaleBeaconItems } from "./queue";
import { flushSdkAnalytics, sendSdkBeacon } from "./transport";
import type { SdkBatchContext, TransportAuth } from "./types";

const FLUSH_INTERVAL_MS = 30_000;

let runtimeRefCount = 0;
let listenersBound = false;
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

let runtimeCtx: SdkBatchContext | null = null;
let runtimeAuth: TransportAuth = {};

export function setAnalyticsSdkRuntimeContext(ctx: SdkBatchContext): void {
  runtimeCtx = ctx;
}

export function setAnalyticsSdkRuntimeAuth(auth: TransportAuth): void {
  runtimeAuth = auth;
}

function onVisibilityFlush(): void {
  if (document.visibilityState === "hidden" && runtimeCtx) {
    void flushSdkAnalytics({ ctx: runtimeCtx, auth: runtimeAuth });
  }
}

function onPageHideBeacon(): void {
  if (runtimeCtx) {
    sendSdkBeacon({ ctx: runtimeCtx, auth: runtimeAuth });
  }
}

/** Ref-counted flush lifecycle; gated by master SDK flag. */
export function initAnalyticsSdkRuntime(): void {
  if (!isAnalyticsSdkEnabled() || typeof window === "undefined") return;

  runtimeRefCount += 1;
  if (listenersBound) return;

  listenersBound = true;
  flushIntervalId = setInterval(() => {
    pruneStaleBeaconItems();
    if (runtimeCtx) {
      void flushSdkAnalytics({ ctx: runtimeCtx, auth: runtimeAuth });
    }
  }, FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibilityFlush);
  window.addEventListener("pagehide", onPageHideBeacon);
}

export function shutdownAnalyticsSdkRuntime(): void {
  if (!isAnalyticsSdkEnabled() || typeof window === "undefined") return;

  runtimeRefCount = Math.max(0, runtimeRefCount - 1);
  if (runtimeRefCount > 0 || !listenersBound) return;

  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  document.removeEventListener("visibilitychange", onVisibilityFlush);
  window.removeEventListener("pagehide", onPageHideBeacon);
  listenersBound = false;
  if (runtimeCtx) {
    sendSdkBeacon({ ctx: runtimeCtx, auth: runtimeAuth });
    void flushSdkAnalytics({ ctx: runtimeCtx, auth: runtimeAuth });
  }
}

/** Test helper */
export function resetAnalyticsSdkRuntimeForTests(): void {
  runtimeRefCount = 0;
  listenersBound = false;
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  runtimeCtx = null;
  runtimeAuth = {};
}
