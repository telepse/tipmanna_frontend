/**
 * Safe fetch + JSON for Next.js server actions.
 * Never throws; returns { data, error, success, message } for backward compatibility.
 * Includes in-flight deduplication and 429 exponential backoff.
 */

/** Next.js extends fetch RequestInit — keep explicit for server-action caching */
export type ServerActionFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export type ActionResult<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
  /** Alias of error when failed — legacy callers */
  message?: string;
  /** Raw error JSON body for field-level validation mapping */
  validationBody?: unknown;
};

export function actionOk<T>(data: T): ActionResult<T> {
  return { data, error: null, success: true };
}

export function actionFail<T = never>(
  message: string,
  logContext?: string
): ActionResult<T> {
  console.error(`[ServerAction${logContext ? `:${logContext}` : ""}]`, message);
  return {
    data: null,
    error: message,
    success: false,
    message,
  };
}

function errorMessageFromBody(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object" && raw !== null && "error" in raw) {
    const err = (raw as { error?: { message?: string } }).error;
    if (typeof err?.message === "string" && err.message) return err.message;
  }
  if (raw && typeof raw === "object" && raw !== null && "message" in raw) {
    const m = (raw as { message?: string }).message;
    if (typeof m === "string" && m) return m;
  }
  return fallback;
}

const inflightRequests = new Map<string, Promise<ActionResult<unknown>>>();
let duplicateRequestCoalesceCount = 0;

export function getFetchDedupCoalesceCount(): number {
  return duplicateRequestCoalesceCount;
}

export function resetFetchDedupCoalesceCount(): void {
  duplicateRequestCoalesceCount = 0;
}

function requestDedupeKey(url: string, init?: ServerActionFetchInit): string {
  const method = init?.method ?? "GET";
  const body =
    typeof init?.body === "string"
      ? init.body
      : init?.body != null
        ? JSON.stringify(init.body)
        : "";
  return `${method}:${url}:${body}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: ServerActionFetchInit | undefined,
  context: string,
  mapSuccess?: (raw: unknown) => unknown
): Promise<ActionResult<unknown>> {
  const maxAttempts = 4;
  let lastResult: ActionResult<unknown> = actionFail("Request failed", context);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init as RequestInit);
      const text = await res.text();
      let raw: unknown = null;
      if (text) {
        try {
          raw = JSON.parse(text) as unknown;
        } catch {
          return actionFail(
            "Server returned invalid JSON",
            `${context} status=${res.status}`
          );
        }
      }

      if (res.status === 429 && attempt < maxAttempts - 1) {
        const retryAfter = res.headers.get("Retry-After");
        const delayMs = retryAfter
          ? Math.min(30_000, parseInt(retryAfter, 10) * 1000 || 1000)
          : Math.min(8000, 500 * 2 ** attempt);
        await sleep(delayMs);
        continue;
      }

      if (!res.ok) {
        const msg = errorMessageFromBody(raw, `Request failed (${res.status})`);
        lastResult = { ...actionFail(msg, context), validationBody: raw };
        if (res.status >= 500 && attempt < maxAttempts - 1) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
        return lastResult;
      }

      const data = mapSuccess ? mapSuccess(raw) : raw;
      return actionOk(data);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Network error — check your connection";
      lastResult = actionFail(msg, context);
      if (attempt < maxAttempts - 1) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
    }
  }
  return lastResult;
}

/**
 * Fetch JSON from backend; never throws.
 */
export async function runServerFetch<T = unknown>(
  url: string,
  init: ServerActionFetchInit | undefined,
  context: string,
  mapSuccess?: (raw: unknown) => T
): Promise<ActionResult<T>> {
  const key = requestDedupeKey(url, init);
  const existing = inflightRequests.get(key);
  if (existing) {
    duplicateRequestCoalesceCount += 1;
    return existing as Promise<ActionResult<T>>;
  }

  const promise = fetchWithRetry(
    url,
    init,
    context,
    mapSuccess as ((raw: unknown) => unknown) | undefined
  ).finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise as Promise<ActionResult<T>>;
}
