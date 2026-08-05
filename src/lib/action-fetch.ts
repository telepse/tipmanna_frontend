/**
 * Safe fetch + JSON for Next.js server actions.
 * Never throws; returns { data, error, success, message } for backward compatibility.
 * Includes in-flight deduplication and 429 exponential backoff.
 */

/** Next.js extends fetch RequestInit — keep explicit for server-action caching */
export type ServerActionFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
  /** Fresh AbortSignal.timeout per retry attempt when set (server-action fetch budget). */
  perAttemptTimeoutMs?: number;
};

export type ActionResult<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
  /** Alias of error when failed — legacy callers */
  message?: string;
  /** Raw error JSON body for field-level validation mapping */
  validationBody?: unknown;
  /** Non-sensitive upstream fetch metadata (Explore pagination correlation). */
  fetchMeta?: ExplorePaginationFetchMeta;
};

export type ExplorePaginationFetchMeta = {
  durationMs?: number;
  coalesceStage?: string;
  coalesceKeyHash?: string;
  coalesceInstanceId?: string;
  aborted?: boolean;
};

const LOG_BODY_MAX = 2048;

function readExplorePaginationFetchMeta(
  res: Response,
  startedAt: number,
  aborted: boolean
): ExplorePaginationFetchMeta | undefined {
  const stage = res.headers.get("x-explore-coalesce-stage");
  const keyHash = res.headers.get("x-explore-coalesce-key-hash");
  const instanceId = res.headers.get("x-explore-coalesce-instance");
  if (!stage && !keyHash && !instanceId && !aborted) return undefined;
  return {
    durationMs: Date.now() - startedAt,
    ...(stage ? { coalesceStage: stage } : {}),
    ...(keyHash ? { coalesceKeyHash: keyHash } : {}),
    ...(instanceId ? { coalesceInstanceId: instanceId } : {}),
    ...(aborted ? { aborted } : {}),
  };
}

type FetchFailureLog = {
  context: string;
  url: string;
  method: string;
  attempt: number;
  maxAttempts: number;
  reason: string;
  status?: number;
  responseBody?: string;
  exceptionName?: string;
  exceptionMessage?: string;
  exceptionCause?: unknown;
  willRetry?: boolean;
  retryDelayMs?: number;
};

function truncateForLog(text: string, max = LOG_BODY_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [truncated ${text.length - max} chars]`;
}

function formatResponseBody(text: string, parsed: unknown): string {
  if (parsed != null && typeof parsed === "object") {
    try {
      return truncateForLog(JSON.stringify(parsed));
    } catch {
      /* fall through to raw text */
    }
  }
  return truncateForLog(text);
}

function isAbortError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "AbortError") return true;
  const cause = (e as Error & { cause?: unknown }).cause;
  return cause instanceof Error && cause.name === "AbortError";
}

function logFetchFailure(details: FetchFailureLog): void {
  const label = `[ServerAction:${details.context}] fetch failed`;
  console.error(label, {
    url: details.url,
    method: details.method,
    attempt: `${details.attempt + 1}/${details.maxAttempts}`,
    reason: details.reason,
    ...(details.status != null ? { status: details.status } : {}),
    ...(details.responseBody != null
      ? { responseBody: details.responseBody }
      : {}),
    ...(details.exceptionName ? { exceptionName: details.exceptionName } : {}),
    ...(details.exceptionMessage
      ? { exceptionMessage: details.exceptionMessage }
      : {}),
    ...(details.exceptionCause !== undefined
      ? { exceptionCause: details.exceptionCause }
      : {}),
    ...(details.willRetry != null ? { willRetry: details.willRetry } : {}),
    ...(details.retryDelayMs != null
      ? { retryDelayMs: details.retryDelayMs }
      : {}),
  });
}

/** Build a failed result without emitting a console log. */
function makeActionFailResult<T = never>(message: string): ActionResult<T> {
  return {
    data: null,
    error: message,
    success: false,
    message,
  };
}

export function actionOk<T>(
  data: T,
  fetchMeta?: ExplorePaginationFetchMeta
): ActionResult<T> {
  return {
    data,
    error: null,
    success: true,
    ...(fetchMeta ? { fetchMeta } : {}),
  };
}

export function actionFail<T = never>(
  message: string,
  logContext?: string
): ActionResult<T> {
  console.error(`[ServerAction${logContext ? `:${logContext}` : ""}]`, message);
  return makeActionFailResult(message);
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

function attemptFetchInit(
  init: ServerActionFetchInit | undefined
): RequestInit {
  if (!init) return {};
  const { perAttemptTimeoutMs, next: _next, ...rest } = init;
  if (perAttemptTimeoutMs != null && perAttemptTimeoutMs > 0) {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(
        new DOMException("The operation was aborted.", "AbortError")
      );
    }, perAttemptTimeoutMs);
    return {
      ...rest,
      signal: controller.signal,
    };
  }
  return rest as RequestInit;
}

export type ServerFetchRetryOptions = {
  /** Override default 4 attempts (pagination uses 2). */
  maxAttempts?: number;
  /** Shared wall-clock budget across all attempts in one cycle. */
  totalDeadlineMs?: number;
};

function remainingDeadlineMs(
  startedAt: number,
  totalDeadlineMs: number | undefined
): number | undefined {
  if (totalDeadlineMs == null || totalDeadlineMs <= 0) return undefined;
  return Math.max(0, totalDeadlineMs - (Date.now() - startedAt));
}

function perAttemptBudgetMs(
  init: ServerActionFetchInit | undefined,
  remainingMs: number | undefined
): number | undefined {
  const configured = init?.perAttemptTimeoutMs;
  if (remainingMs == null) return configured;
  if (configured == null || configured <= 0) return remainingMs;
  return Math.min(configured, remainingMs);
}

async function fetchWithRetry(
  url: string,
  init: ServerActionFetchInit | undefined,
  context: string,
  mapSuccess?: (raw: unknown) => unknown,
  retryOpts?: ServerFetchRetryOptions
): Promise<ActionResult<unknown>> {
  const maxAttempts = retryOpts?.maxAttempts ?? 4;
  const totalDeadlineMs = retryOpts?.totalDeadlineMs;
  const startedAt = Date.now();
  const method = init?.method ?? "GET";
  let lastResult: ActionResult<unknown> =
    makeActionFailResult("Request failed");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const remaining = remainingDeadlineMs(startedAt, totalDeadlineMs);
    if (totalDeadlineMs != null && remaining != null && remaining <= 0) {
      logFetchFailure({
        context,
        url,
        method,
        attempt,
        maxAttempts,
        reason: "Pagination total deadline exhausted",
        willRetry: false,
      });
      return makeActionFailResult("Request timed out (total deadline)");
    }

    const attemptInit: ServerActionFetchInit = {
      ...(init ?? {}),
      perAttemptTimeoutMs: perAttemptBudgetMs(init, remaining),
    };

    try {
      const attemptStartedAt = Date.now();
      const res = await fetch(url, attemptFetchInit(attemptInit));
      const text = await res.text();
      let raw: unknown = null;
      if (text) {
        try {
          raw = JSON.parse(text) as unknown;
        } catch {
          const reason = "Server returned invalid JSON";
          logFetchFailure({
            context,
            url,
            method,
            attempt,
            maxAttempts,
            reason,
            status: res.status,
            responseBody: truncateForLog(text),
            willRetry: false,
          });
          return makeActionFailResult(reason);
        }
      }

      if (
        res.status === 429 &&
        attempt < maxAttempts - 1 &&
        (remainingDeadlineMs(startedAt, totalDeadlineMs) ?? 1) > 0
      ) {
        const retryAfter = res.headers.get("Retry-After");
        const delayMs = retryAfter
          ? Math.min(30_000, parseInt(retryAfter, 10) * 1000 || 1000)
          : Math.min(8000, 500 * 2 ** attempt);
        logFetchFailure({
          context,
          url,
          method,
          attempt,
          maxAttempts,
          reason: "Rate limited (429)",
          status: 429,
          responseBody: formatResponseBody(text, raw),
          willRetry: true,
          retryDelayMs: delayMs,
        });
        await sleep(delayMs);
        continue;
      }

      if (!res.ok) {
        const msg = errorMessageFromBody(raw, `Request failed (${res.status})`);
        const willRetry =
          res.status >= 500 &&
          attempt < maxAttempts - 1 &&
          (remainingDeadlineMs(startedAt, totalDeadlineMs) ?? 1) > 0;
        const retryDelayMs = willRetry ? 400 * 2 ** attempt : undefined;
        logFetchFailure({
          context,
          url,
          method,
          attempt,
          maxAttempts,
          reason: msg,
          status: res.status,
          responseBody: formatResponseBody(text, raw),
          willRetry,
          retryDelayMs,
        });
        lastResult = { ...makeActionFailResult(msg), validationBody: raw };
        if (willRetry) {
          await sleep(retryDelayMs!);
          continue;
        }
        return lastResult;
      }

      const data = mapSuccess ? mapSuccess(raw) : raw;
      return actionOk(
        data,
        readExplorePaginationFetchMeta(res, attemptStartedAt, false)
      );
    } catch (e) {
      const isAbort = isAbortError(e);
      const meta = isAbort
        ? readExplorePaginationFetchMeta(
            new Response(null, { status: 408 }),
            Date.now(),
            true
          )
        : undefined;
      const msg = isAbort
        ? "Request timed out (AbortSignal)"
        : e instanceof Error
          ? e.message
          : "Network error — check your connection";
      const willRetry =
        attempt < maxAttempts - 1 &&
        (remainingDeadlineMs(startedAt, totalDeadlineMs) ?? 1) > 0;
      const retryDelayMs = willRetry ? 400 * 2 ** attempt : undefined;
      logFetchFailure({
        context,
        url,
        method,
        attempt,
        maxAttempts,
        reason: msg,
        exceptionName: e instanceof Error ? e.name : typeof e,
        exceptionMessage: e instanceof Error ? e.message : String(e),
        exceptionCause:
          e instanceof Error && "cause" in e ? (e as Error).cause : undefined,
        willRetry,
        retryDelayMs,
      });
      lastResult = {
        ...makeActionFailResult(msg),
        ...(meta ? { fetchMeta: meta } : {}),
      };
      if (willRetry) {
        await sleep(retryDelayMs!);
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
  mapSuccess?: (raw: unknown) => T,
  retryOpts?: ServerFetchRetryOptions
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
    mapSuccess as ((raw: unknown) => unknown) | undefined,
    retryOpts
  ).finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise);
  return promise as Promise<ActionResult<T>>;
}
