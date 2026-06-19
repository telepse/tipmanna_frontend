/**
 * TV debug logging: zero work when disabled (early return before string building).
 * Enable with ?tvDebug=1 or NEXT_PUBLIC_TV_DEBUG=true
 */

let queryParsed = false;
let queryDebugFlag = false;

function readQueryDebug(): boolean {
  if (typeof window === "undefined") return false;
  if (!queryParsed) {
    queryParsed = true;
    queryDebugFlag = new URLSearchParams(window.location.search).has("tvDebug");
  }
  return queryDebugFlag;
}

export function isTvDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_TV_DEBUG === "true") return true;
  return readQueryDebug();
}

export function logTV(event: string, payload: Record<string, unknown>): void {
  if (!isTvDebugEnabled()) return;

  console.info(`[TV] ${event}`, {
    timestamp: Date.now(),
    ...payload,
  });
}
