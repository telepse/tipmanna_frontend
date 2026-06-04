/**
 * Serializes YouTube iframe API script injection and `onYouTubeIframeAPIReady`
 * so concurrent VideoPlayer mounts do not overwrite each other's callbacks.
 */

type ReadyCallback = () => void;

let loadPromise: Promise<void> | null = null;
let apiReady = false;
const readyQueue: ReadyCallback[] = [];

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

function ensureScriptTag(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("youtube-iframe-api")) return;

  const tag = document.createElement("script");
  tag.id = "youtube-iframe-api";
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

export function ensureYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player || apiReady) return Promise.resolve();

  if (!loadPromise) {
    loadPromise = new Promise<void>(resolve => {
      const prior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prior?.();
        flushReadyQueue();
        resolve();
      };

      if (document.getElementById("youtube-iframe-api")) {
        if (window.YT?.Player) {
          flushReadyQueue();
          resolve();
        }
        return;
      }

      ensureScriptTag();
    });
  }

  return loadPromise;
}

/** Register a callback when the iframe API is ready; returns an unsubscribe. */
export function onYoutubeIframeApiReady(callback: ReadyCallback): () => void {
  if (typeof window === "undefined") return () => {};

  if (window.YT?.Player || apiReady) {
    queueMicrotask(callback);
    return () => {};
  }

  readyQueue.push(callback);
  void ensureYoutubeIframeApi();

  return () => {
    const idx = readyQueue.indexOf(callback);
    if (idx >= 0) readyQueue.splice(idx, 1);
  };
}
