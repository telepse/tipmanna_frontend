/**
 * Serializes YouTube iframe API script injection and `onYouTubeIframeAPIReady`
 * so concurrent mounts do not overwrite each other's callbacks.
 *
 * Phase C2.2 — hardened for early TV warm-up: shared promise, source-based
 * script detection, absolute deadline, failure recovery.
 */

export type YoutubeIframeApiLoaderState =
  | "idle"
  | "loading"
  | "ready"
  | "failed";

export type YoutubeIframeApiAcquireOutcome =
  | "reused_existing_object"
  | "reused_existing_script"
  | "script_inserted";

export type YoutubeIframeApiAcquireResult = {
  state: YoutubeIframeApiLoaderState;
  outcome:
    | YoutubeIframeApiAcquireOutcome
    | "already_ready"
    | "failed"
    | "timed_out";
};

type ReadyCallback = () => void;

export const YOUTUBE_IFRAME_API_CANONICAL_URL =
  "https://www.youtube.com/iframe_api";
export const YOUTUBE_IFRAME_API_SCRIPT_ID = "youtube-iframe-api";

let loaderState: YoutubeIframeApiLoaderState = "idle";
let loadPromise: Promise<YoutubeIframeApiAcquireResult> | null = null;
let apiReady = false;
let settled = false;
let insertedByLoader = false;
let ownedScriptEl: HTMLScriptElement | null = null;
let absoluteDeadlineMs: number | null = null;
let deadlineTimer: ReturnType<typeof setTimeout> | null = null;

const readyQueue: ReadyCallback[] = [];

type WindowWithYt = Window & {
  YT?: { Player?: unknown };
  onYouTubeIframeAPIReady?: () => void;
};

function getWindow(): WindowWithYt | undefined {
  if (typeof window === "undefined") return undefined;
  return window as WindowWithYt;
}

export function isYoutubeIframeApiScriptSrc(src: string): boolean {
  try {
    const url = new URL(src, "https://www.youtube.com");
    const host = url.hostname.replace(/^www\./, "");
    return host === "youtube.com" && url.pathname.includes("iframe_api");
  } catch {
    return src.includes("youtube.com") && src.includes("iframe_api");
  }
}

export function findExistingIframeApiScript(): HTMLScriptElement | null {
  if (typeof document === "undefined") return null;
  for (const node of document.querySelectorAll("script[src]")) {
    const src = node.getAttribute("src");
    if (src && isYoutubeIframeApiScriptSrc(src)) {
      return node as HTMLScriptElement;
    }
  }
  return null;
}

function isYtPlayerPresent(): boolean {
  const w = getWindow();
  return Boolean(w?.YT && w.YT.Player);
}

function flushReadyQueue(): void {
  apiReady = true;
  const pending = readyQueue.splice(0, readyQueue.length);
  for (const cb of pending) {
    try {
      cb();
    } catch (err) {
      console.error("[YouTube iframe API] ready callback failed", err);
    }
  }
}

function clearDeadlineTimer(): void {
  if (deadlineTimer != null) {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
  }
}

function removeOwnedFailedScript(): void {
  if (!insertedByLoader || !ownedScriptEl) return;
  try {
    ownedScriptEl.remove();
  } catch {
    /* ignore */
  }
  ownedScriptEl = null;
  insertedByLoader = false;
}

function resetLoaderOwnershipAfterFailure(): void {
  clearDeadlineTimer();
  loadPromise = null;
  settled = false;
  loaderState = "idle";
  apiReady = false;
}

type SettleFn = (result: YoutubeIframeApiAcquireResult) => void;

function settleOnce(
  settle: SettleFn,
  result: YoutubeIframeApiAcquireResult
): void {
  if (settled) return;
  settled = true;
  clearDeadlineTimer();
  loaderState = result.state;
  if (result.state === "ready") {
    apiReady = true;
    flushReadyQueue();
  }
  settle(result);
}

function invokePriorCallbackSafely(prior: (() => void) | undefined): void {
  if (!prior) return;
  try {
    prior();
  } catch (err) {
    console.error(
      "[YouTube iframe API] prior onYouTubeIframeAPIReady failed",
      err
    );
  }
}

function attachHandlersToScript(
  script: HTMLScriptElement,
  settle: SettleFn,
  acquireOutcome: YoutubeIframeApiAcquireOutcome
): void {
  const onReady = () => {
    if (isYtPlayerPresent()) {
      settleOnce(settle, { state: "ready", outcome: acquireOutcome });
    }
  };

  script.addEventListener("load", () => {
    if (isYtPlayerPresent()) {
      settleOnce(settle, { state: "ready", outcome: acquireOutcome });
    }
  });

  script.addEventListener("error", () => {
    if (insertedByLoader) {
      removeOwnedFailedScript();
      resetLoaderOwnershipAfterFailure();
    }
    settleOnce(settle, { state: "failed", outcome: "failed" });
  });

  if (isYtPlayerPresent()) {
    onReady();
  }
}

function installGlobalReadyHandler(
  settle: SettleFn,
  acquireOutcome: YoutubeIframeApiAcquireOutcome
): void {
  const w = getWindow();
  if (!w) return;

  const prior = w.onYouTubeIframeAPIReady;
  w.onYouTubeIframeAPIReady = () => {
    invokePriorCallbackSafely(prior);
    if (isYtPlayerPresent()) {
      settleOnce(settle, { state: "ready", outcome: acquireOutcome });
    }
  };

  if (isYtPlayerPresent()) {
    queueMicrotask(() => {
      invokePriorCallbackSafely(prior);
      settleOnce(settle, { state: "ready", outcome: acquireOutcome });
    });
  }
}

function scheduleAbsoluteDeadline(settle: SettleFn): void {
  if (absoluteDeadlineMs == null) return;
  const remaining = absoluteDeadlineMs - performance.now();
  if (remaining <= 0) {
    if (insertedByLoader) {
      removeOwnedFailedScript();
    }
    settleOnce(settle, { state: "failed", outcome: "timed_out" });
    if (insertedByLoader) {
      resetLoaderOwnershipAfterFailure();
    }
    return;
  }

  clearDeadlineTimer();
  deadlineTimer = setTimeout(() => {
    if (settled) return;
    if (insertedByLoader) {
      removeOwnedFailedScript();
    }
    settleOnce(settle, { state: "failed", outcome: "timed_out" });
    if (insertedByLoader) {
      resetLoaderOwnershipAfterFailure();
    }
  }, remaining);
}

function insertCanonicalScript(): HTMLScriptElement {
  const tag = document.createElement("script");
  tag.id = YOUTUBE_IFRAME_API_SCRIPT_ID;
  tag.src = YOUTUBE_IFRAME_API_CANONICAL_URL;
  document.body.appendChild(tag);
  insertedByLoader = true;
  ownedScriptEl = tag;
  return tag;
}

export function getYoutubeIframeApiLoaderState(): YoutubeIframeApiLoaderState {
  return loaderState;
}

export function isYoutubeIframeApiReady(): boolean {
  return apiReady || isYtPlayerPresent();
}

export function getYoutubeIframeApiLoadPromise(): Promise<YoutubeIframeApiAcquireResult> | null {
  return loadPromise;
}

export function getYoutubeIframeApiAbsoluteDeadlineMs(): number | null {
  return absoluteDeadlineMs;
}

export function getYoutubeIframeApiRemainingDeadlineMs(): number | null {
  if (absoluteDeadlineMs == null) return null;
  return Math.max(0, absoluteDeadlineMs - performance.now());
}

export type AcquireYoutubeIframeApiOptions = {
  /** Absolute performance.now() deadline (from T2 warm-up request). */
  absoluteDeadlineMs?: number;
};

/**
 * Acquire the YouTube IFrame API script (no player/iframe creation).
 * Returns a shared document-scoped promise.
 */
export function acquireYoutubeIframeApi(
  opts?: AcquireYoutubeIframeApiOptions
): Promise<YoutubeIframeApiAcquireResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ state: "ready", outcome: "already_ready" });
  }

  if (isYtPlayerPresent() || apiReady) {
    loaderState = "ready";
    return Promise.resolve({
      state: "ready",
      outcome: "reused_existing_object",
    });
  }

  if (opts?.absoluteDeadlineMs != null) {
    absoluteDeadlineMs = opts.absoluteDeadlineMs;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loaderState = "loading";
  settled = false;

  loadPromise = new Promise<YoutubeIframeApiAcquireResult>(resolve => {
    const settle: SettleFn = result => resolve(result);

    if (isYtPlayerPresent()) {
      settleOnce(settle, {
        state: "ready",
        outcome: "reused_existing_object",
      });
      return;
    }

    const existing = findExistingIframeApiScript();
    const hasExistingById = Boolean(
      document.getElementById(YOUTUBE_IFRAME_API_SCRIPT_ID)
    );
    const acquireOutcome: YoutubeIframeApiAcquireOutcome =
      existing || hasExistingById
        ? "reused_existing_script"
        : "script_inserted";

    installGlobalReadyHandler(settle, acquireOutcome);

    if (existing) {
      attachHandlersToScript(existing, settle, "reused_existing_script");
      scheduleAbsoluteDeadline(settle);
      return;
    }

    if (hasExistingById) {
      const byId = document.getElementById(
        YOUTUBE_IFRAME_API_SCRIPT_ID
      ) as HTMLScriptElement;
      attachHandlersToScript(byId, settle, "reused_existing_script");
      scheduleAbsoluteDeadline(settle);
      return;
    }

    const tag = insertCanonicalScript();
    tag.addEventListener("error", () => {
      removeOwnedFailedScript();
      settleOnce(settle, { state: "failed", outcome: "failed" });
      resetLoaderOwnershipAfterFailure();
    });
    tag.addEventListener("load", () => {
      if (isYtPlayerPresent()) {
        settleOnce(settle, { state: "ready", outcome: "script_inserted" });
      }
    });

    scheduleAbsoluteDeadline(settle);
  });

  return loadPromise;
}

/** @deprecated Prefer acquireYoutubeIframeApi — kept for events/video-player path. */
export function ensureYoutubeIframeApi(): Promise<void> {
  return acquireYoutubeIframeApi().then(result => {
    if (result.state === "failed" || result.outcome === "timed_out") {
      return;
    }
  });
}

/** Register a callback when the iframe API is ready; returns an unsubscribe. */
export function onYoutubeIframeApiReady(callback: ReadyCallback): () => void {
  if (typeof window === "undefined") return () => {};

  if (isYtPlayerPresent() || apiReady) {
    queueMicrotask(callback);
    return () => {};
  }

  readyQueue.push(callback);
  void acquireYoutubeIframeApi();

  return () => {
    const idx = readyQueue.indexOf(callback);
    if (idx >= 0) readyQueue.splice(idx, 1);
  };
}

/** Test-only reset. */
export function __resetYoutubeIframeApiLoaderForTest(): void {
  clearDeadlineTimer();
  loadPromise = null;
  loaderState = "idle";
  apiReady = false;
  settled = false;
  insertedByLoader = false;
  ownedScriptEl = null;
  absoluteDeadlineMs = null;
  readyQueue.splice(0, readyQueue.length);
}
